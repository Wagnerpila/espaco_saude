import {
  ensureHolidayBlocksForAllProfessionals,
  listAppointmentsConflictingWithHolidays,
  cancelHolidayAppointment,
} from '../services/holidays.js';

// Bloqueia a agenda de todos os profissionais nos feriados nacionais/municipais
// de Imbaú/PR (idempotente — pode rodar de novo sem duplicar bloqueio já
// criado). Não mexe em agendamento nenhum, só cria os ScheduleBlock.
export async function blockAllProfessionalsForHolidays(_req, res, next) {
  try {
    const result = await ensureHolidayBlocksForAllProfessionals();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listHolidayConflicts(_req, res, next) {
  try {
    const items = await listAppointmentsConflictingWithHolidays();
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function cancelHolidayConflict(req, res, next) {
  try {
    const { appointmentId } = req.body || {};
    if (!appointmentId) return res.status(400).json({ error: 'appointmentId é obrigatório' });
    const result = await cancelHolidayAppointment(appointmentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
