import { prisma } from '../db.js';

const HOLIDAYS_2026 = [
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

export async function createHolidayBlocks(req, res, next) {
  try {
    const professionalId = req.body?.professional_id;
    if (!professionalId) return res.status(400).json({ error: 'professional_id é obrigatório' });

    const results = await prisma.$transaction(
      HOLIDAYS_2026.map((h) =>
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

    res.json({ success: true, created: results.length });
  } catch (err) {
    next(err);
  }
}
