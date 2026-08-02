import { prisma } from '../db.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { formatDateBR, formatCurrency, todayBrasilia } from '../utils/format.js';
import { loadMessageRenderer } from './whatsappMessages.js';

// Nenhuma cobrança vencida sai por WhatsApp sozinha (ver dailyNotifications.js,
// de onde essa automação foi removida) — o admin precisa confirmar antes, pelo
// pop-up do Financeiro, que o pagamento realmente não caiu (evita avisar um
// cliente que já pagou, mas cuja baixa manual ainda não foi lançada).
//
// A confirmação vale só para o dia: se a cobrança seguir pendente amanhã, ela
// volta a aparecer no pop-up, mesmo já tendo sido confirmada/enviada hoje.
function wasReminderSentToday(record) {
  if (!record.lastBillingReminderAt) return false;
  const sentDateBrasilia = record.lastBillingReminderAt.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  return sentDateBrasilia === todayBrasilia();
}

function computeDaysOverdue(transactionDate, today) {
  const ms = new Date(today) - new Date(transactionDate);
  return Math.max(1, Math.round(ms / 86400000));
}

export async function listPendingBillingConfirmations() {
  const today = todayBrasilia();
  // "Vencido" = pendente com data de transação anterior a hoje — vencer hoje
  // não entra aqui, a cobrança só é liberada a partir de 1 dia de atraso.
  const records = await prisma.financialRecord.findMany({
    where: { paymentStatus: 'pending', type: 'income', transactionDate: { lt: new Date(today) } },
    orderBy: { transactionDate: 'asc' },
  });

  const due = records.filter((r) => !wasReminderSentToday(r));
  if (!due.length) return [];

  const patientIds = [...new Set(due.map((r) => r.patientId).filter(Boolean))];
  const patients = await prisma.patient.findMany({ where: { id: { in: patientIds } } });
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  return due.map((r) => {
    const patient = patientMap.get(r.patientId);
    return {
      id: r.id,
      patientId: r.patientId,
      patientName: patient?.fullName || 'Paciente',
      patientPhone: patient?.phone || null,
      description: r.description,
      amount: r.amount,
      transactionDate: r.transactionDate,
      daysOverdue: computeDaysOverdue(r.transactionDate, today),
    };
  });
}

export async function sendConfirmedBillingReminder(financialRecordId) {
  const record = await prisma.financialRecord.findUnique({ where: { id: financialRecordId } });
  if (!record) throw new Error('Cobrança não encontrada');
  if (record.paymentStatus !== 'pending') throw new Error('Esta cobrança não está mais pendente');

  const patient = record.patientId ? await prisma.patient.findUnique({ where: { id: record.patientId } }) : null;
  if (!patient?.phone) throw new Error('Paciente sem telefone cadastrado');

  const t = await loadMessageRenderer();
  const message = t('PENDING_PAYMENT_REMINDER', {
    patient_name: patient.fullName,
    items_list: `• ${record.description || 'Serviço'} — R$ ${formatCurrency(record.amount)} (${formatDateBR(record.transactionDate)})`,
    total: formatCurrency(record.amount),
  });

  // sendWhatsAppMessage nunca lança — em vez de deixar o admin achar que a
  // cobrança saiu quando na verdade falhou, checa o resultado explicitamente.
  const result = await sendWhatsAppMessage(patient.phone, message);
  if (!result.success) throw new Error(result.error || 'Falha ao enviar mensagem pelo WhatsApp');

  await prisma.financialRecord.update({
    where: { id: financialRecordId },
    data: { lastBillingReminderAt: new Date() },
  });

  return { sent: true };
}
