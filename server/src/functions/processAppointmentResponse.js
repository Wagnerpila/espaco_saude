import { prisma } from '../db.js';
import { sendEmail } from '../services/email.js';
import { formatDateBR } from '../utils/format.js';

// Rota pública: o paciente chega aqui pelo link de confirmação enviado por
// WhatsApp/email (página ConfirmAppointment.jsx), sem estar logado. A
// "segurança" é o appointmentId ser um id opaco (mesmo modelo do base44
// original, que também não exigia autenticação aqui).
export async function processAppointmentResponse(req, res, next) {
  try {
    const { appointmentId, action, cancelReason } = req.body || {};
    if (!appointmentId || !action) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios não fornecidos' });
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });

    const [patient, professional] = await Promise.all([
      prisma.patient.findUnique({ where: { id: appointment.patientId } }),
      prisma.professional.findUnique({ where: { id: appointment.professionalId } }),
    ]);

    const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: newStatus,
        notes: action === 'cancel' && cancelReason
          ? `${appointment.notes || ''}\n\nMotivo do cancelamento: ${cancelReason}`.trim()
          : appointment.notes,
      },
    });

    await prisma.notification.create({
      data: {
        type: action === 'confirm' ? 'appointment_confirmed' : 'appointment_cancelled',
        title: action === 'confirm' ? 'Agendamento Confirmado' : 'Agendamento Cancelado',
        message: `${patient?.fullName} ${action === 'confirm' ? 'confirmou' : 'cancelou'} agendamento para ${formatDateBR(appointment.appointmentDate)} às ${appointment.appointmentTime}`,
        patientId: appointment.patientId,
        appointmentId,
        priority: action === 'cancel' ? 'high' : 'medium',
        data: {
          patient_name: patient?.fullName,
          professional_name: professional?.fullName,
          appointment_date: appointment.appointmentDate,
          appointment_time: appointment.appointmentTime,
          reason: cancelReason || null,
        },
      },
    });

    const emailSubject = action === 'confirm'
      ? `✅ Agendamento Confirmado - ${patient?.fullName}`
      : `❌ Agendamento Cancelado - ${patient?.fullName}`;

    const emailBody = `Olá ${professional?.fullName},<br><br>
O paciente ${patient?.fullName} ${action === 'confirm' ? 'confirmou' : 'cancelou'} o agendamento:<br><br>
📅 Data: ${formatDateBR(appointment.appointmentDate)}<br>
⏰ Horário: ${appointment.appointmentTime}<br>
🔸 Serviço: ${appointment.serviceType || 'Consulta'}<br><br>
${action === 'cancel' && cancelReason ? `💬 Motivo: ${cancelReason}<br><br>` : ''}
📱 Contato do paciente: ${patient?.phone || 'Não informado'}<br><br>
Atenciosamente,<br>Sistema Espaço Saúde<br>💙 Estética • Fisioterapia • Pilates`;

    try {
      await sendEmail({ to: professional?.email || process.env.SMTP_FROM, subject: emailSubject, body: emailBody });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
    }

    res.json({
      success: true,
      message: action === 'confirm' ? 'Agendamento confirmado com sucesso!' : 'Agendamento cancelado com sucesso!',
    });
  } catch (err) {
    next(err);
  }
}
