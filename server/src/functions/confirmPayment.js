import { prisma } from '../db.js';
import { sendPaymentReceiptWhatsApp } from '../services/receipts.js';

export async function confirmPayment(req, res, next) {
  try {
    const { transactionId, paymentMethod, notes } = req.body || {};
    if (!transactionId || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'ID da transação e método de pagamento são obrigatórios' });
    }

    const transaction = await prisma.financialRecord.findUnique({ where: { id: transactionId } });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transação não encontrada' });

    const updated = await prisma.financialRecord.update({
      where: { id: transactionId },
      data: {
        paymentMethod,
        paymentStatus: 'paid',
        notes: notes ? `${transaction.notes || ''}\n\nPagamento confirmado: ${notes}`.trim() : transaction.notes,
      },
    });

    if (transaction.appointmentId) {
      await prisma.appointment.update({ where: { id: transaction.appointmentId }, data: { paymentStatus: 'paid' } });
    }

    const patient = transaction.patientId ? await prisma.patient.findUnique({ where: { id: transaction.patientId } }) : null;

    await prisma.notification.create({
      data: {
        type: 'payment_confirmed',
        title: 'Pagamento Confirmado',
        message: `Pagamento de R$ ${transaction.amount.toFixed(2)} confirmado para ${patient?.fullName}`,
        patientId: transaction.patientId,
        appointmentId: transaction.appointmentId,
        financialRecordId: transactionId,
        priority: 'medium',
        data: { patient_name: patient?.fullName, amount: transaction.amount, payment_method: paymentMethod },
      },
    });

    // Substitui a automação base44 onPaymentConfirmed: envia o comprovante por WhatsApp.
    sendPaymentReceiptWhatsApp(updated).catch((err) => console.error('[confirmPayment] Falha ao enviar comprovante:', err));

    res.json({ success: true, message: 'Pagamento confirmado com sucesso' });
  } catch (err) {
    next(err);
  }
}
