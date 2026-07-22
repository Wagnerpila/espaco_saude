import { prisma } from '../db.js';

export async function syncPaymentStatus(req, res, next) {
  try {
    const { appointmentId, paymentStatus } = req.body || {};
    if (!appointmentId || !paymentStatus) {
      return res.status(400).json({ success: false, message: 'ID do agendamento e status de pagamento são obrigatórios' });
    }

    await prisma.appointment.update({ where: { id: appointmentId }, data: { paymentStatus } });

    const transaction = await prisma.financialRecord.findFirst({ where: { appointmentId } });
    if (transaction) {
      await prisma.financialRecord.update({ where: { id: transaction.id }, data: { paymentStatus } });
    }

    res.json({ success: true, message: 'Status de pagamento sincronizado com sucesso' });
  } catch (err) {
    next(err);
  }
}
