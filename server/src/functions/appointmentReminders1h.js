import { sendOneHourAppointmentReminders } from '../services/appointmentNotifications.js';

// Lembretes de 1h antes da consulta. Chamado pelo cron interno a cada
// 15min (ver src/cron.js) e também exposto como endpoint para disparo manual.
export async function appointmentReminders1h(_req, res, next) {
  try {
    const result = await sendOneHourAppointmentReminders();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
