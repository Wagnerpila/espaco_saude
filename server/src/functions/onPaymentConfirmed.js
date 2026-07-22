import { prisma } from '../db.js';
import { sendPaymentReceiptWhatsApp } from '../services/receipts.js';

// Endpoint manual equivalente à automação base44 (ver hook automático em
// entities.routes.js e em functions/confirmPayment.js, que já disparam isso
// sozinhos quando um FinancialRecord de receita vira 'paid').
export async function onPaymentConfirmed(req, res, next) {
  try {
    const financialRecordId = req.body?.financial_record_id;
    if (!financialRecordId) return res.status(400).json({ error: 'financial_record_id é obrigatório' });

    const record = await prisma.financialRecord.findUnique({ where: { id: financialRecordId } });
    if (!record) return res.status(404).json({ error: 'Registro financeiro não encontrado' });

    const result = await sendPaymentReceiptWhatsApp(record);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
