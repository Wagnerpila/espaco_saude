import { prisma } from '../db.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { formatDateBR } from '../utils/format.js';
import { loadMessageRenderer, renderTemplate } from './whatsappMessages.js';
import { getAppointmentWords } from '../utils/appointmentLabel.js';
import { resolveConfirmationOverride } from './appointmentConfirmationOverrides.js';

// Detecta o serviço "Depilação a LED" (texto livre digitado no agendamento,
// ver AppointmentForm.jsx) ignorando maiúsculas/minúsculas, pra escolher a
// variação de template com a imagem de cuidados pré-sessão (ver
// APPOINTMENT_CONFIRMATION_NOTIFICATION_DEPILACAO_LED em whatsappMessages.js).
// "depila" casa com "depilação"/"depilacao" sem precisar tratar acento — os
// acentos da palavra (ç, ã) vêm só depois dessas 6 primeiras letras.
function isDepilacaoLed(serviceType) {
  const normalized = String(serviceType || '').toLowerCase();
  return normalized.includes('depila') && normalized.includes('led');
}

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
  const templateKey = isDepilacaoLed(appointment.serviceType)
    ? 'APPOINTMENT_CONFIRMATION_NOTIFICATION_DEPILACAO_LED'
    : 'APPOINTMENT_CONFIRMATION_NOTIFICATION';
  const vars = {
    patient_name: patient.fullName,
    date: formatDateBR(appointment.appointmentDate),
    time: appointment.appointmentTime,
    professional_line: professional ? `👨‍⚕️ *Profissional:* ${professional.fullName}\n` : '',
    service_line: appointment.serviceType ? `🏷️ *Serviço:* ${appointment.serviceType}\n` : '',
    appointment_noun: words.noun,
    appointment_article: words.article,
    appointment_confirmed: words.confirmedWord,
  };

  // Override por profissional específico ou por especialidade (ver
  // services/appointmentConfirmationOverrides.js) tem prioridade sobre o
  // template padrão/Depilação a LED escolhido acima — nessa ordem:
  // profissional > especialidade > serviço > padrão. `template` nulo no
  // override significa "usa o texto padrão, só troca a imagem".
  const override = await resolveConfirmationOverride({ professionalId: appointment.professionalId, specialty: professional?.specialty });
  const message = override?.template ? renderTemplate(override.template, vars) : t(templateKey, vars);
  const mediaUrl = override?.mediaUrl || t.media(templateKey);

  await sendWhatsAppMessage(patient.phone, message, mediaUrl);

  return { success: true, patient_name: patient.fullName };
}

// Aviso de cancelamento pela clínica — enviado quando o colaborador exclui o
// agendamento e escolhe avisar o paciente (popup em AppointmentCard.jsx). É
// chamado ANTES da exclusão, enquanto o agendamento ainda existe no banco.
export async function sendAppointmentCancellationWhatsApp(appointment) {
  const [patient, professional] = await Promise.all([
    prisma.patient.findUnique({ where: { id: appointment.patientId } }),
    appointment.professionalId ? prisma.professional.findUnique({ where: { id: appointment.professionalId } }) : null,
  ]);

  if (!patient?.phone) return { skipped: true, reason: 'Paciente sem telefone' };

  const words = getAppointmentWords(appointment.serviceType, professional?.specialty);
  const t = await loadMessageRenderer();
  const message = t('APPOINTMENT_CANCELLATION_NOTIFICATION', {
    patient_name: patient.fullName,
    date: formatDateBR(appointment.appointmentDate),
    time: appointment.appointmentTime,
    professional_line: professional ? `👨‍⚕️ *Profissional:* ${professional.fullName}\n` : '',
    service_line: appointment.serviceType ? `🏷️ *Serviço:* ${appointment.serviceType}\n` : '',
    appointment_noun: words.noun,
    appointment_article: words.article,
    appointment_cancelled: words.confirmedWord.replace('confirmad', 'cancelad'),
  });

  await sendWhatsAppMessage(patient.phone, message, t.media('APPOINTMENT_CANCELLATION_NOTIFICATION'));

  return { success: true, patient_name: patient.fullName };
}

// Aviso de cancelamento por ausência do profissional — disparado quando um
// admin marca o agendamento como "professional_absence" pelo painel (ver
// hook em routes/entities.routes.js).
export async function sendProfessionalAbsenceWhatsApp(appointment) {
  if (!appointment || appointment.status !== 'professional_absence') {
    return { skipped: true, reason: 'Agendamento não está marcado como ausência do profissional' };
  }

  const [patient, professional] = await Promise.all([
    prisma.patient.findUnique({ where: { id: appointment.patientId } }),
    appointment.professionalId ? prisma.professional.findUnique({ where: { id: appointment.professionalId } }) : null,
  ]);

  if (!patient?.phone) return { skipped: true, reason: 'Paciente sem telefone' };

  const t = await loadMessageRenderer();
  const message = t('PROFESSIONAL_ABSENCE_NOTIFICATION', {
    patient_name: patient.fullName,
    date: formatDateBR(appointment.appointmentDate),
    time: appointment.appointmentTime,
    professional_line: professional ? ` com *${professional.fullName}*` : '',
  });

  await sendWhatsAppMessage(patient.phone, message, t.media('PROFESSIONAL_ABSENCE_NOTIFICATION'));

  await prisma.notification.create({
    data: {
      type: 'professional_absence_notification',
      title: 'Aviso de ausência do profissional enviado',
      message: `Aviso de cancelamento por ausência do profissional enviado para ${patient.fullName}`,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      priority: 'medium',
    },
  });

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
      await sendWhatsAppMessage(patient.phone, message, t.media('APPOINTMENT_REMINDER_1H'));
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
