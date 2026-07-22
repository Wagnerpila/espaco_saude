import { prisma } from '../db.js';
import { incrementPackageSessionsForAppointment } from '../services/packages.js';

// Endpoint manual equivalente à automação base44 (ver hook automático em
// entities.routes.js, que chama o mesmo serviço quando o status muda para
// 'completed' via PUT /api/entities/Appointment/:id).
export async function onAppointmentCompleted(req, res, next) {
  try {
    const appointmentId = req.body?.appointment_id;
    if (!appointmentId) return res.status(400).json({ error: 'appointment_id é obrigatório' });

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return res.status(404).json({ error: 'Atendimento não encontrado' });

    const result = await incrementPackageSessionsForAppointment(appointment);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
