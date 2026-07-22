import { prisma } from '../db.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { formatDateBR, formatCurrency } from '../utils/format.js';

const METHOD_LABELS = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card: 'Cartão',
  bank_transfer: 'Transferência Bancária',
  pending: 'Pendente',
};

// Porte de base44/functions/onPaymentConfirmed — dispara automaticamente
// quando um FinancialRecord de receita vira 'paid' (ver hook em
// entities.routes.js e em functions/confirmPayment.js).
export async function sendPaymentReceiptWhatsApp(financialRecord) {
  if (!financialRecord || financialRecord.type !== 'income' || financialRecord.paymentStatus !== 'paid') {
    return { skipped: true, reason: 'Não é receita paga' };
  }
  if (!financialRecord.patientId) return { skipped: true, reason: 'Sem patient_id' };

  const [patient, professional] = await Promise.all([
    prisma.patient.findUnique({ where: { id: financialRecord.patientId } }),
    financialRecord.professionalId ? prisma.professional.findUnique({ where: { id: financialRecord.professionalId } }) : null,
  ]);

  if (!patient?.phone) return { skipped: true, reason: 'Paciente sem telefone' };

  const gross = Number(financialRecord.amount || 0);
  const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
  const paymentLabel = METHOD_LABELS[financialRecord.paymentMethod] || financialRecord.paymentMethod || 'Não informado';

  const message = [
    `🧾 *Comprovante de Pagamento*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏥 *Clínica Espaço Saúde*`,
    `Estética • Fisioterapia • Pilates`,
    ``,
    `Nº ${receiptNumber}`,
    `📅 Data: ${formatDateBR(financialRecord.transactionDate)}`,
    ``,
    `👤 *Paciente:* ${patient.fullName}`,
    professional ? `👨‍⚕️ *Profissional:* ${professional.fullName}` : '',
    `🏷️ *Serviço:* ${financialRecord.description || 'Consulta'}`,
    `💳 *Pagamento:* ${paymentLabel}`,
    ``,
    `✅ *Valor pago: R$ ${formatCurrency(gross)}*`,
    ``,
    `Obrigado pela preferência! 💙`,
    `━━━━━━━━━━━━━━━━━━━━`,
  ].filter((s) => s !== '').join('\n');

  await sendWhatsAppMessage(patient.phone, message);

  return { success: true, patient_name: patient.fullName, receipt_number: receiptNumber };
}
