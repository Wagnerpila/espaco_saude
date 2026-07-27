import { Router } from 'express';
import { prisma } from '../db.js';
import { getEntityConfig } from '../entityMap.js';
import { requireAuth } from '../middleware/auth.js';
import { loadPermissions } from '../middleware/rbac.js';
import { requestToPrisma, prismaToResponse } from '../utils/case.js';
import { generateCommissionForAppointment, cancelFinancialsForAppointment } from '../services/commissions.js';
import { incrementPackageSessionsForAppointment } from '../services/packages.js';
import { createPendingIncomeForCompletedAppointment } from '../services/appointmentBilling.js';
import { sendPaymentReceiptWhatsApp } from '../services/receipts.js';
import { sendAppointmentConfirmationWhatsApp, sendProfessionalAbsenceWhatsApp } from '../services/appointmentNotifications.js';

export const entitiesRouter = Router();

// Replica as automações que o base44 disparava automaticamente por mudança
// de campo (ele não expõe essa configuração no código, só o efeito — as
// funções generateCommission/onAppointmentCompleted/onPaymentConfirmed).
// Aqui religamos explicitamente os mesmos gatilhos para quem edita as
// entidades diretamente pelo painel (fora das rotas dedicadas em
// functions.routes.js, que já disparam isso sozinhas quando fazem sentido).
// Status em que a sessão não aconteceu, por qualquer motivo — nunca deve
// gerar/manter cobrança ou comissão.
const NOT_HAPPENED_STATUSES = ['no_show', 'justified_absence', 'professional_absence', 'null_absence', 'cancelled'];
const NOT_HAPPENED_LABELS = {
  no_show: 'não compareceu',
  justified_absence: 'ausência justificada',
  professional_absence: 'ausência do profissional',
  null_absence: 'ausência nula',
  cancelled: 'cancelado',
};

async function fireEntityTriggers(entityName, before, after) {
  if (entityName === 'Appointment' && after.status === 'completed' && before?.status !== 'completed') {
    await generateCommissionForAppointment(after.id);
    await incrementPackageSessionsForAppointment(after);
    await createPendingIncomeForCompletedAppointment(after);
  }
  if (
    entityName === 'Appointment' &&
    NOT_HAPPENED_STATUSES.includes(after.status) &&
    before?.status !== after.status
  ) {
    await cancelFinancialsForAppointment(after.id, NOT_HAPPENED_LABELS[after.status] || after.status);
  }
  if (entityName === 'Appointment' && after.status === 'confirmed' && before?.status !== 'confirmed') {
    await sendAppointmentConfirmationWhatsApp(after);
  }
  if (entityName === 'Appointment' && after.status === 'professional_absence' && before?.status !== 'professional_absence') {
    await sendProfessionalAbsenceWhatsApp(after);
  }
  if (
    entityName === 'FinancialRecord' &&
    after.type === 'income' &&
    after.paymentStatus === 'paid' &&
    before?.paymentStatus !== 'paid'
  ) {
    await sendPaymentReceiptWhatsApp(after);
  }
}

const snakeToCamel = (str) => str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

// O frontend usa a convenção base44 created_date/updated_date, mas o campo
// real no Prisma é createdAt/updatedAt (ver prismaToResponse) — sem esse
// alias, ordenar por "-created_date" (usado em vários componentes) quebraria.
const SORT_FIELD_ALIASES = { created_date: 'createdAt', updated_date: 'updatedAt' };

function parseSort(sort) {
  if (!sort) return undefined;
  const parts = String(sort).split(',').map((s) => s.trim()).filter(Boolean);
  const orderBy = parts.map((part) => {
    const desc = part.startsWith('-');
    const rawField = desc ? part.slice(1) : part;
    const field = SORT_FIELD_ALIASES[rawField] || snakeToCamel(rawField);
    return { [field]: desc ? 'desc' : 'asc' };
  });
  return orderBy.length ? orderBy : undefined;
}

// Todas as rotas de entidade exigem sessão válida. Regras de RLS mais finas
// (ex.: paciente só vê os próprios registros) ficam para rotas dedicadas
// quando necessário — este router genérico cobre o padrão base44.entities.X
// usado hoje por ~30 componentes do frontend.
entitiesRouter.use(requireAuth, loadPermissions);

entitiesRouter.param('name', (req, res, next, name) => {
  const config = getEntityConfig(name);
  if (!config) return res.status(404).json({ error: `Entidade desconhecida: ${name}` });
  req.entityConfig = config;
  next();
});

// Lista com filtro simples de igualdade + ordenação + limite.
// Body: { filter?: { campo_snake: valor }, sort?: '-campo' | 'campo', limit?: number }
entitiesRouter.post('/:name/query', async (req, res, next) => {
  try {
    const { filter, sort, limit } = req.body || {};
    const where = filter ? requestToPrisma(filter, req.entityConfig) : undefined;
    const rows = await prisma[req.entityConfig.model].findMany({
      where,
      orderBy: parseSort(sort),
      take: limit ? Number(limit) : undefined,
    });
    res.json(rows.map((r) => prismaToResponse(r, req.entityConfig.dateFields)));
  } catch (err) {
    next(err);
  }
});

entitiesRouter.get('/:name/:id', async (req, res, next) => {
  try {
    const row = await prisma[req.entityConfig.model].findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Não encontrado' });
    res.json(prismaToResponse(row, req.entityConfig.dateFields));
  } catch (err) {
    next(err);
  }
});

entitiesRouter.post('/:name', async (req, res, next) => {
  try {
    const data = requestToPrisma(req.body, req.entityConfig);
    const row = await prisma[req.entityConfig.model].create({ data });
    res.status(201).json(prismaToResponse(row, req.entityConfig.dateFields));
  } catch (err) {
    next(err);
  }
});

entitiesRouter.post('/:name/bulk', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body?.items;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Esperado um array de itens' });
    const created = [];
    for (const item of items) {
      const data = requestToPrisma(item, req.entityConfig);
      created.push(await prisma[req.entityConfig.model].create({ data }));
    }
    res.status(201).json(created.map((r) => prismaToResponse(r, req.entityConfig.dateFields)));
  } catch (err) {
    next(err);
  }
});

entitiesRouter.put('/:name/:id', async (req, res, next) => {
  try {
    const before = await prisma[req.entityConfig.model].findUnique({ where: { id: req.params.id } });
    const data = requestToPrisma(req.body, req.entityConfig);
    const row = await prisma[req.entityConfig.model].update({ where: { id: req.params.id }, data });

    fireEntityTriggers(req.params.name, before, row).catch((err) =>
      console.error(`[entities] Falha ao disparar automação para ${req.params.name}:`, err)
    );

    res.json(prismaToResponse(row, req.entityConfig.dateFields));
  } catch (err) {
    next(err);
  }
});

entitiesRouter.delete('/:name/:id', async (req, res, next) => {
  try {
    await prisma[req.entityConfig.model].delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    // commissions.appointment_id é ON DELETE RESTRICT (ver migration.sql) —
    // um agendamento com comissão já gerada não pode ser excluído direto.
    if (err.code === 'P2003' && req.params.name === 'Appointment') {
      return res.status(409).json({ error: 'Não é possível excluir: já existe uma comissão gerada para este agendamento.' });
    }
    next(err);
  }
});
