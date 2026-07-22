import { prisma } from '../db.js';
import { prismaToResponse } from '../utils/case.js';

// Pública — igual a processAppointmentResponse, alimenta a página
// ConfirmAppointment.jsx (link de WhatsApp/email, paciente pode não estar
// logado). Só devolve os campos necessários para exibir a tela de
// confirmação, sem PII do paciente além do nome.
export async function getAppointmentPublicDetails(req, res, next) {
  try {
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const [patient, professional] = await Promise.all([
      prisma.patient.findUnique({ where: { id: appointment.patientId } }),
      prisma.professional.findUnique({ where: { id: appointment.professionalId } }),
    ]);

    res.json({
      appointment: prismaToResponse(appointment, ['appointment_date']),
      patient: patient ? { full_name: patient.fullName } : null,
      professional: professional ? { full_name: professional.fullName, specialty: professional.specialty } : null,
    });
  } catch (err) {
    next(err);
  }
}
