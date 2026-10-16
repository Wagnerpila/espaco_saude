import { prisma } from '../db.js';
import { sendAppointmentCancellationWhatsApp } from '../services/appointmentNotifications.js';

// Aviso de cancelamento por WhatsApp — chamado pelo popup de exclusão do
// agendamento (AppointmentCard.jsx) logo antes de excluir, quando o
// colaborador escolhe avisar o paciente.
export async function sendAppointmentCancellationNotification(req, res, next) {
  try {
    const { appointment_id } = req.body || {};
    if (!appointment_id) return res.status(400).json({ error: 'appointment_id é obrigatório' });

    const appointment = await prisma.appointment.findUnique({ where: { id: appointment_id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const result = await sendAppointmentCancellationWhatsApp(appointment);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
