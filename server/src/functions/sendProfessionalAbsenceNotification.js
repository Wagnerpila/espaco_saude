import { prisma } from '../db.js';
import { sendProfessionalAbsenceWhatsApp } from '../services/appointmentNotifications.js';

// Reenvio manual do aviso de ausência do profissional — usado pelo botão
// "Enviar" no popup do agendamento (AppointmentCard.jsx) quando o envio
// automático (hook em routes/entities.routes.js) não aconteceu ou falhou.
export async function sendProfessionalAbsenceNotification(req, res, next) {
  try {
    const { appointment_id } = req.body || {};
    if (!appointment_id) return res.status(400).json({ error: 'appointment_id é obrigatório' });

    const appointment = await prisma.appointment.findUnique({ where: { id: appointment_id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const result = await sendProfessionalAbsenceWhatsApp(appointment);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
