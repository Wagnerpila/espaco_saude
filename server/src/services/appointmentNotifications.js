import { prisma } from '../db.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { formatDateBR } from '../utils/format.js';
import { loadMessageRenderer } from './whatsappMessages.js';
import { getAppointmentWords } from '../utils/appointmentLabel.js';

// Confirmação de agendamento por WhatsApp — disparada tanto quando o próprio
// paciente confirma pelo bot de chat (ver services/whatsappBot.js, que já
// manda a confirmação na própria conversa) quanto quando um admin confirma
// manualmente pelo painel (ver hook em routes/entities.routes.js, que chama
// esta função quando o status de um Appointment muda para 'confirmed').
export async function sendAppointmentConfirmationWhatsApp(appointment) {
  if (!appointment || appointment.status !== 'confirmed') {
    return { skipped: true, reason: 'Agendamento não está confirmado' };
  }

  const [patient, professional] = await Promise.all([
    prisma.patient.findUnique({ where: { id: appointment.patientId } }),
    appointment.professionalId ? prisma.professional.findUnique({ where: { id: appointment.professionalId } }) : null,
  ]);

  if (!patient?.phone) return { skipped: true, reason: 'Paciente sem telefone' };

  const words = getAppointmentWords(appointment.serviceType, professional?.specialty);
  const t = await loadMessageRenderer();
  const message = t('APPOINTMENT_CONFIRMATION_NOTIFICATION', {
    patient_name: patient.fullName,
    date: formatDateBR(appointment.appointmentDate),
    time: appointment.appointmentTime,
    professional_line: professional ? `👨‍⚕️ *Profissional:* ${professional.fullName}\n` : '',
    service_line: appointment.serviceType ? `🏷️ *Serviço:* ${appointment.serviceType}\n` : '',
    appointment_noun: words.noun,
    appointment_article: words.article,
    appointment_confirmed: words.confirmedWord,
  });

  await sendWhatsAppMessage(patient.phone, message);

  return { success: true, patient_name: patient.fullName };
}

// Lembretes de 1h antes da consulta. Roda a cada 15min (ver src/cron.js) e
// usa a tabela Notification como registro de dedupe (type
// 'appointment_reminder_1h') pra não mandar duas vezes a mesma consulta
// dentro da janela de tolerância.
export async function sendOneHourAppointmentReminders() {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 70 * 60 * 1000);
  const todayIso = now.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  const [appointments, patients, professionals] = await Promise.all([
    prisma.appointment.findMany({ where: { appointmentDate: new Date(todayIso), status: { in: ['pending', 'confirmed'] } } }),
    prisma.patient.findMany(),
    prisma.professional.findMany(),
  ]);

  const dueApts = appointments.filter((apt) => {
    if (!/^\d{2}:\d{2}$/.test(String(apt.appointmentTime))) return false;
    const aptDateTime = new Date(`${todayIso}T${apt.appointmentTime}:00-03:00`);
    return aptDateTime >= windowStart && aptDateTime <= windowEnd;
  });

  const sent = [];
  const errors = [];
  const t = await loadMessageRenderer();

  for (const apt of dueApts) {
    const already = await prisma.notification.findFirst({
      where: { appointmentId: apt.id, type: 'appointment_reminder_1h' },
    });
    if (already) continue;

    const patient = patients.find((p) => p.id === apt.patientId);
    if (!patient?.phone) continue;
    const professional = professionals.find((p) => p.id === apt.professionalId);
    const words = getAppointmentWords(apt.serviceType, professional?.specialty);

    const message = t('APPOINTMENT_REMINDER_1H', {
      patient_name: patient.fullName,
      time: apt.appointmentTime,
      professional_line: professional ? `Profissional: *${professional.fullName}*\n` : '',
      appointment_noun: words.noun,
      appointment_article: words.article,
    });

    try {
      await sendWhatsAppMessage(patient.phone, message);
      await prisma.notification.create({
        data: {
          type: 'appointment_reminder_1h',
          title: 'Lembrete de 1h enviado',
          message: `Lembrete de 1h antes enviado para ${patient.fullName} (consulta às ${apt.appointmentTime})`,
          patientId: apt.patientId,
          appointmentId: apt.id,
          priority: 'low',
        },
      });
      sent.push({ patient: patient.fullName, time: apt.appointmentTime });
    } catch (err) {
      errors.push({ patient: patient.fullName, error: err.message });
    }
  }

  return { sent: sent.length, errors: errors.length, details: { sent, errors } };
}
