/**
 * Automação: disparada quando um FinancialRecord muda para payment_status = 'paid'
 * Gera comprovante texto e envia via WhatsApp ao paciente.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : '55' + digits;
}

function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const METHOD_LABELS = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card: 'Cartão',
  bank_transfer: 'Transferência Bancária',
  pending: 'Pendente'
};

Deno.serve(async (req) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  const base44 = createClientFromRequest(req);

  let body = {};
  try { body = await req.json(); } catch (_) {}

  const { event, data } = body;

  console.log(`[onPaymentConfirmed] evento: ${event?.type}, entity_id: ${event?.entity_id}`);

  if (!data || data.payment_status !== 'paid' || data.type !== 'income') {
    return Response.json({ skipped: true, reason: 'Não é receita paga' }, { headers });
  }

  const patientId = data.patient_id;
  if (!patientId) {
    return Response.json({ skipped: true, reason: 'Sem patient_id' }, { headers });
  }

  // Buscar paciente e profissional em paralelo
  const [patients, professionals] = await Promise.all([
    base44.asServiceRole.entities.Patient.list(),
    base44.asServiceRole.entities.Professional.list()
  ]);

  const patient = patients.find(p => p.id === patientId);
  const professional = data.professional_id ? professionals.find(p => p.id === data.professional_id) : null;

  if (!patient?.phone) {
    return Response.json({ skipped: true, reason: 'Paciente sem telefone' }, { headers });
  }

  const gross = Number(data.amount || 0);
  const iss = gross * 0.05; // 5% ISS padrão
  const net = gross - iss;
  const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
  const paymentLabel = METHOD_LABELS[data.payment_method] || data.payment_method || 'Não informado';

  const message = [
    `🧾 *Comprovante de Pagamento*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏥 *Clínica Espaço Saúde*`,
    `Estética • Fisioterapia • Pilates`,
    ``,
    `Nº ${receiptNumber}`,
    `📅 Data: ${formatDateBR(data.transaction_date)}`,
    ``,
    `👤 *Paciente:* ${patient.full_name}`,
    professional ? `👨‍⚕️ *Profissional:* ${professional.full_name}` : '',
    `🏷️ *Serviço:* ${data.description || 'Consulta'}`,
    `💳 *Pagamento:* ${paymentLabel}`,
    ``,
    `💰 *Valor:* R$ ${formatCurrency(gross)}`,
    iss > 0 ? `📋 ISS (5%): - R$ ${formatCurrency(iss)}` : '',
    iss > 0 ? `✅ *Valor líquido: R$ ${formatCurrency(net)}*` : `✅ *Valor pago: R$ ${formatCurrency(gross)}*`,
    ``,
    `Obrigado pela preferência! 💙`,
    `━━━━━━━━━━━━━━━━━━━━`
  ].filter(s => s !== '').join('\n');

  // Envia via função de WhatsApp
  await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
    phone: patient.phone,
    message
  });

  console.log(`[onPaymentConfirmed] Comprovante enviado para ${patient.full_name} (${patient.phone})`);

  return Response.json({ success: true, patient_name: patient.full_name, receipt_number: receiptNumber }, { headers });
});