import { prisma } from '../db.js';
import { formatPhone, todayBrasilia } from '../utils/format.js';

// Porte de base44/functions/dailyReminders. Mantido por compatibilidade —
// só monta e retorna a lista de lembretes (não envia). `dailyNotifications`
// é quem efetivamente envia via WhatsApp e é a função agendada no cron.
export async function dailyReminders(_req, res, next) {
  try {
    const today = todayBrasilia();
    const [appointments, patients, professionals] = await Promise.all([
      prisma.appointment.findMany({ where: { appointmentDate: new Date(today) } }),
      prisma.patient.findMany(),
      prisma.professional.findMany(),
    ]);
    const activeApts = appointments.filter((a) => ['pending', 'confirmed'].includes(a.status));

    const reminders = activeApts
      .map((apt) => {
        const patient = patients.find((p) => p.id === apt.patientId);
        const professional = professionals.find((p) => p.id === apt.professionalId);
        if (!patient?.phone) return null;

        const message = [
          `🔔 *Lembrete de Consulta - Clínica Espaço Saúde!*`,
          ``,
          `Olá, ${patient.fullName}! 👋`,
          `Você tem uma consulta *hoje*.`,
          ``,
          `⏰ *Horário:* ${apt.appointmentTime}`,
          `👨‍⚕️ *Profissional:* ${professional?.fullName || 'A confirmar'}`,
          apt.serviceType ? `🏥 *Serviço:* ${apt.serviceType}` : '',
          ``,
          `Para confirmar, responda com *SIM*.`,
          `Para cancelar, responda com *CANCELAR*.`,
          `Clínica Espaço Saúde 💙`,
        ].filter(Boolean).join('\n');

        return {
          appointment_id: apt.id,
          patient_name: patient.fullName,
          whatsapp_phone: formatPhone(patient.phone),
          message,
        };
      })
      .filter(Boolean);

    res.json({ date: today, total: reminders.length, reminders });
  } catch (err) {
    next(err);
  }
}
