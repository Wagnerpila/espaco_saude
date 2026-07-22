import { prisma } from '../db.js';
import { sendAppointmentConfirmationWhatsApp } from '../services/appointmentNotifications.js';

// Endpoint manual equivalente à automação (ver hook automático em
// entities.routes.js, que já dispara isso sozinho quando o status de um
// Appointment muda para 'confirmed' via PUT /api/entities/Appointment/:id).
export async function onAppointmentConfirmed(req, res, next) {
  try {
    const appointmentId = req.body?.appointment_id;
    if (!appointmentId) return res.status(400).json({ error: 'appointment_id é obrigatório' });

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const result = await sendAppointmentConfirmationWhatsApp(appointment);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
