import { prisma } from '../db.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';
import { formatDateBR, formatCurrency, todayBrasilia } from '../utils/format.js';
import { loadMessageRenderer } from '../services/whatsappMessages.js';
import { getAppointmentWords } from '../utils/appointmentLabel.js';

// Automação diária: lembretes de consulta do dia + avisos de pagamento pendente.
// Chamada pelo cron interno (ver src/cron.js) e também exposta como endpoint
// para disparo manual.
export async function dailyNotifications(_req, res, next) {
  try {
    const today = todayBrasilia();

    const [appointments, patients, financialRecords, professionals] = await Promise.all([
      prisma.appointment.findMany({ where: { appointmentDate: new Date(today) } }),
      prisma.patient.findMany(),
      // "Vencido" = pendente com data de transação anterior a hoje. Pendências
      // do dia (ex.: consulta de hoje ainda não paga) não entram aqui.
      prisma.financialRecord.findMany({ where: { paymentStatus: 'pending', type: 'income', transactionDate: { lt: new Date(today) } } }),
      prisma.professional.findMany(),
    ]);

    const sentReminders = [];
    const sentPending = [];
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

    const pendingByPatient = {};
    for (const record of financialRecords) {
      if (!record.patientId) continue;
      (pendingByPatient[record.patientId] ||= []).push(record);
    }

    for (const [patientId, records] of Object.entries(pendingByPatient)) {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient?.phone) continue;

      const total = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const itemsList = records
        .slice(0, 5)
        .map((r) => `• ${r.description || 'Serviço'} — R$ ${formatCurrency(r.amount)} (${formatDateBR(r.transactionDate)})`)
        .join('\n');
      const maisItens = records.length > 5 ? `\n_...e mais ${records.length - 5} item(s)_` : '';

      const message = t('PENDING_PAYMENT_REMINDER', {
        patient_name: patient.fullName,
        items_list: itemsList + maisItens,
        total: formatCurrency(total),
      });

      try {
        await sendWhatsAppMessage(patient.phone, message);
        sentPending.push({ patient: patient.fullName, total, count: records.length });
      } catch (err) {
        errors.push({ type: 'pending_payment', patient: patient.fullName, error: err.message });
      }
    }

    console.log(`[dailyNotifications] ${today}: ${sentReminders.length} lembretes, ${sentPending.length} pendências enviadas`);

    res.json({
      date: today,
      reminders_sent: sentReminders.length,
      pending_payments_sent: sentPending.length,
      errors: errors.length,
      details: { sentReminders, sentPending, errors },
    });
  } catch (err) {
    next(err);
  }
}
