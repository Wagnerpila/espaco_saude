import { prisma } from '../db.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { formatDateBR, todayBrasilia } from '../utils/format.js';
import { loadMessageRenderer } from './whatsappMessages.js';
import { cancelFinancialsForAppointment } from './commissions.js';

// Feriados nacionais + municipais de Imbaú/PR — conferidos em
// https://feriados.com.br/PR/Imbaú (nacionais: Lei 14.759/2023 já inclui 20/11
// como feriado nacional; municipais: 19/03 São José e 08/12 aniversário de
// emancipação do município). Não inclui pontos facultativos (Carnaval, Corpus
// Christi, etc.) — esses não fecham a clínica automaticamente.
export const IMBAU_PR_HOLIDAYS_2026 = [
  { date: '2026-01-01', reason: 'Ano Novo (Nacional)' },
  { date: '2026-03-19', reason: 'São José (Municipal - Imbaú)' },
  { date: '2026-04-03', reason: 'Sexta-Feira Santa (Nacional)' },
  { date: '2026-04-21', reason: 'Tiradentes (Nacional)' },
  { date: '2026-05-01', reason: 'Dia do Trabalho (Nacional)' },
  { date: '2026-09-07', reason: 'Independência do Brasil (Nacional)' },
  { date: '2026-10-12', reason: 'Nossa Senhora Aparecida (Nacional)' },
  { date: '2026-11-02', reason: 'Dia de Finados (Nacional)' },
  { date: '2026-11-15', reason: 'Proclamação da República (Nacional)' },
  { date: '2026-11-20', reason: 'Consciência Negra (Nacional)' },
  { date: '2026-12-08', reason: 'Feriado Municipal - Imbaú' },
  { date: '2026-12-25', reason: 'Natal (Nacional)' },
];

// Cria os bloqueios de feriado que ainda não existem pra este profissional —
// idempotente (checa por professionalId + startDate antes de criar), pra
// poder rodar de novo sem duplicar caso já tenha sido chamada antes (ex.: 1x
// na migração e depois de novo manualmente pelo admin).
export async function ensureHolidayBlocksForProfessional(professionalId) {
  const existing = await prisma.scheduleBlock.findMany({
    where: { professionalId, blockType: 'full_day', startDate: { in: IMBAU_PR_HOLIDAYS_2026.map((h) => new Date(h.date)) } },
  });
  const existingDates = new Set(existing.map((b) => b.startDate.toISOString().slice(0, 10)));

  const missing = IMBAU_PR_HOLIDAYS_2026.filter((h) => !existingDates.has(h.date));
  if (!missing.length) return { created: 0 };

  const results = await prisma.$transaction(
    missing.map((h) =>
      prisma.scheduleBlock.create({
        data: {
          professionalId,
          blockType: 'full_day',
          startDate: new Date(h.date),
          endDate: new Date(h.date),
          reason: h.reason,
          active: true,
        },
      })
    )
  );
  return { created: results.length };
}

// Roda pra todos os profissionais ativos de uma vez — usado tanto pra
// corrigir profissionais já cadastrados quanto internamente pelo hook que
// dispara ao cadastrar um profissional novo (ver entities.routes.js).
export async function ensureHolidayBlocksForAllProfessionals() {
  const professionals = await prisma.professional.findMany({ where: { active: true } });
  let blocksCreated = 0;
  for (const professional of professionals) {
    const { created } = await ensureHolidayBlocksForProfessional(professional.id);
    blocksCreated += created;
  }
  return { professionalsProcessed: professionals.length, blocksCreated };
}

// Agendamentos (de qualquer profissional) que caem em cima de um feriado e
// ainda não foram tratados — só considera daqui pra frente (feriado que já
// passou não precisa de correção). Retorna a lista pra o admin revisar antes
// de cancelar e avisar o paciente (mesmo padrão de confirmação usado pra
// cobrança vencida, ver services/billingConfirmation.js).
export async function listAppointmentsConflictingWithHolidays() {
  const today = todayBrasilia();
  const holidayDates = IMBAU_PR_HOLIDAYS_2026.filter((h) => h.date >= today).map((h) => h.date);
  if (!holidayDates.length) return [];

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['pending', 'confirmed'] },
      appointmentDate: { in: holidayDates.map((d) => new Date(d)) },
    },
    orderBy: { appointmentDate: 'asc' },
  });
  if (!appointments.length) return [];

  const [patients, professionals] = await Promise.all([
    prisma.patient.findMany({ where: { id: { in: [...new Set(appointments.map((a) => a.patientId))] } } }),
    prisma.professional.findMany({ where: { id: { in: [...new Set(appointments.map((a) => a.professionalId).filter(Boolean))] } } }),
  ]);
  const patientMap = new Map(patients.map((p) => [p.id, p]));
  const professionalMap = new Map(professionals.map((p) => [p.id, p]));
  const reasonByDate = new Map(IMBAU_PR_HOLIDAYS_2026.map((h) => [h.date, h.reason]));

  return appointments.map((a) => {
    const dateIso = a.appointmentDate.toISOString().slice(0, 10);
    return {
      id: a.id,
      patientName: patientMap.get(a.patientId)?.fullName || 'Paciente',
      patientPhone: patientMap.get(a.patientId)?.phone || null,
      professionalName: professionalMap.get(a.professionalId)?.fullName || null,
      appointmentDate: dateIso,
      appointmentTime: a.appointmentTime,
      serviceType: a.serviceType,
      holidayReason: reasonByDate.get(dateIso) || 'Feriado',
    };
  });
}

// Cancela um agendamento em cima de feriado e avisa o paciente por WhatsApp —
// só dispara depois do admin confirmar (ver função acima), nunca sozinho.
export async function cancelHolidayAppointment(appointmentId) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new Error('Agendamento não encontrado');
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    throw new Error('Este agendamento já não está mais pendente/confirmado');
  }

  const dateIso = appointment.appointmentDate.toISOString().slice(0, 10);
  const holiday = IMBAU_PR_HOLIDAYS_2026.find((h) => h.date === dateIso);
  const reason = holiday?.reason || 'Feriado';

  const patient = await prisma.patient.findUnique({ where: { id: appointment.patientId } });

  // Manda o aviso ANTES de cancelar — se o WhatsApp falhar, é melhor abortar e
  // deixar o admin tentar de novo do que cancelar sem o paciente ficar sabendo.
  if (patient?.phone) {
    const t = await loadMessageRenderer();
    const message = t('HOLIDAY_CLOSURE_NOTIFICATION', {
      patient_name: patient.fullName,
      date: formatDateBR(appointment.appointmentDate),
      time: appointment.appointmentTime,
      holiday_reason: reason,
    });
    const result = await sendWhatsAppMessage(patient.phone, message);
    if (!result.success) throw new Error(result.error || 'Falha ao enviar mensagem pelo WhatsApp');
  }

  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'cancelled' } });
  await cancelFinancialsForAppointment(appointmentId, `Feriado — ${reason}`);

  await prisma.notification.create({
    data: {
      type: 'holiday_cancellation',
      title: 'Agendamento cancelado por feriado',
      message: `Agendamento de ${patient?.fullName || 'paciente'} em ${formatDateBR(appointment.appointmentDate)} cancelado (${reason})`,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      priority: 'medium',
    },
  });

  return { success: true };
}
