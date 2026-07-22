/**
 * Automação diária:
 * 1. Lembrete de consultas do dia
 * 2. Notificação de pagamentos pendentes
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : '55' + digits;
}

function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayBrasilia() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

Deno.serve(async (req) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  const base44 = createClientFromRequest(req);

  const today = todayBrasilia();

  const [appointments, patients, professionals, financialRecords] = await Promise.all([
    base44.asServiceRole.entities.Appointment.filter({ appointment_date: today }),
    base44.asServiceRole.entities.Patient.list(),
    base44.asServiceRole.entities.Professional.list(),
    base44.asServiceRole.entities.FinancialRecord.filter({ payment_status: 'pending', type: 'income' })
  ]);

  const sentReminders = [];
  const sentPending = [];
  const errors = [];

  // ── 1. Lembretes de consultas do dia ──────────────────────
  const activeApts = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));

  for (const apt of activeApts) {
    const patient = patients.find(p => p.id === apt.patient_id);
    const professional = professionals.find(p => p.id === apt.professional_id);
    if (!patient?.phone) continue;

    const message = [
      `🔔 *Lembrete de Consulta - Clínica Espaço Saúde*`,
      ``,
      `Olá, ${patient.full_name}! 👋`,
      `Você tem uma consulta *hoje*:`,
      ``,
      `⏰ *Horário:* ${apt.appointment_time}`,
      `👨‍⚕️ *Profissional:* ${professional?.full_name || 'A confirmar'}`,
      apt.service_type ? `🏥 *Serviço:* ${apt.service_type}` : '',
      ``,
      `📍 Não esqueça de comparecer no horário marcado.`,
      `Para cancelar ou reagendar, responda esta mensagem.`,
      ``,
      `Clínica Espaço Saúde 💙`
    ].filter(Boolean).join('\n');

    try {
      await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
        phone: patient.phone,
        message
      });
      sentReminders.push({ patient: patient.full_name, time: apt.appointment_time });
    } catch (err) {
      errors.push({ type: 'reminder', patient: patient.full_name, error: err.message });
    }
  }

  // ── 2. Notificações de pagamentos pendentes ────────────────
  // Agrupa por paciente para não enviar múltiplas mensagens
  const pendingByPatient = {};
  for (const record of financialRecords) {
    if (!record.patient_id) continue;
    if (!pendingByPatient[record.patient_id]) {
      pendingByPatient[record.patient_id] = [];
    }
    pendingByPatient[record.patient_id].push(record);
  }

  for (const [patientId, records] of Object.entries(pendingByPatient)) {
    const patient = patients.find(p => p.id === patientId);
    if (!patient?.phone) continue;

    const total = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const itemsList = records.slice(0, 5).map(r =>
      `• ${r.description || 'Serviço'} — R$ ${formatCurrency(r.amount)} (${formatDateBR(r.transaction_date)})`
    ).join('\n');
    const maisItens = records.length > 5 ? `\n_...e mais ${records.length - 5} item(s)_` : '';

    const message = [
      `💳 *Lembrete de Pagamento Pendente*`,
      ``,
      `Olá, ${patient.full_name}! 👋`,
      `Você possui pagamento(s) pendente(s) na Clínica Espaço Saúde:`,
      ``,
      itemsList + maisItens,
      ``,
      `💰 *Total pendente: R$ ${formatCurrency(total)}*`,
      ``,
      `Entre em contato ou compareça à clínica para regularizar.`,
      `Clínica Espaço Saúde 💙`
    ].join('\n');

    try {
      await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
        phone: patient.phone,
        message
      });
      sentPending.push({ patient: patient.full_name, total, count: records.length });
    } catch (err) {
      errors.push({ type: 'pending_payment', patient: patient.full_name, error: err.message });
    }
  }

  console.log(`[dailyNotifications] ${today}: ${sentReminders.length} lembretes, ${sentPending.length} pendências enviadas`);

  return Response.json({
    date: today,
    reminders_sent: sentReminders.length,
    pending_payments_sent: sentPending.length,
    errors: errors.length,
    details: { sentReminders, sentPending, errors }
  }, { headers });
});