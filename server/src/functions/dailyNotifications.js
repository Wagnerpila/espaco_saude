import { prisma } from '../db.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';
import { todayBrasilia } from '../utils/format.js';
import { loadMessageRenderer } from '../services/whatsappMessages.js';
import { getAppointmentWords } from '../utils/appointmentLabel.js';

// Automação diária: lembretes de consulta do dia. Chamada pelo cron interno
// (ver src/cron.js) e também exposta como endpoint para disparo manual.
//
// Avisos de pagamento vencido NÃO são mais enviados automaticamente daqui —
// isso exige confirmação do admin primeiro (ver services/billingConfirmation.js
// e o pop-up de cobranças pendentes no Financeiro), pra evitar cobrar um
// cliente que já pagou mas cuja baixa manual ainda não foi lançada.
export async function dailyNotifications(_req, res, next) {
  try {
    const today = todayBrasilia();

    const [appointments, patients, professionals] = await Promise.all([
      prisma.appointment.findMany({ where: { appointmentDate: new Date(today) } }),
      prisma.patient.findMany(),
      prisma.professional.findMany(),
    ]);

    const sentReminders = [];
    const errors = [];
    const t = await loadMessageRenderer();

    const activeApts = appointments.filter((a) => ['pending', 'confirmed'].includes(a.status));

    for (const apt of activeApts) {
      const patient = patients.find((p) => p.id === apt.patientId);
      const professional = professionals.find((p) => p.id === apt.professionalId);
      if (!patient?.phone) continue;

      const words = getAppointmentWords(apt.serviceType, professional?.specialty);
      const message = t('DAILY_APPOINTMENT_REMINDER', {
        patient_name: patient.fullName,
        time: apt.appointmentTime,
        professional_name: professional?.fullName || 'A confirmar',
        service_line: apt.serviceType ? `🏥 *Serviço:* ${apt.serviceType}\n` : '',
        appointment_noun: words.noun,
        appointment_article_indef: words.articleIndef,
      });

      try {
        await sendWhatsAppMessage(patient.phone, message);
        sentReminders.push({ patient: patient.fullName, time: apt.appointmentTime });
      } catch (err) {
        errors.push({ type: 'reminder', patient: patient.fullName, error: err.message });
      }
    }

    console.log(`[dailyNotifications] ${today}: ${sentReminders.length} lembretes enviados`);

    res.json({
      date: today,
      reminders_sent: sentReminders.length,
      errors: errors.length,
      details: { sentReminders, errors },
    });
  } catch (err) {
    next(err);
  }
}
