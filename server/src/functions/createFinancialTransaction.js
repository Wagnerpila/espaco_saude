import { prisma } from '../db.js';
import { prismaToResponse } from '../utils/case.js';

export async function createFinancialTransaction(req, res, next) {
  try {
    const { appointmentId, paymentStatus = 'pending' } = req.body || {};
    if (!appointmentId) return res.status(400).json({ success: false, message: 'ID do agendamento é obrigatório' });

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });

    const existing = await prisma.financialRecord.findFirst({ where: { appointmentId } });
    if (existing) return res.status(400).json({ success: false, message: 'Transação já existe para este agendamento' });

    const patient = await prisma.patient.findUnique({ where: { id: appointment.patientId } });

    const transaction = await prisma.financialRecord.create({
      data: {
        type: 'income',
        appointmentId,
        patientId: appointment.patientId,
        professionalId: appointment.professionalId,
        description: `Consulta - ${patient?.fullName || 'Paciente'} - ${appointment.serviceType || 'Consulta'}`,
        amount: appointment.value || 0,
        paymentMethod: 'pending',
        transactionDate: appointment.appointmentDate,
        paymentStatus,
      },
    });

    await prisma.notification.create({
      data: {
        type: 'payment_pending',
        title: 'Pagamento Pendente',
        message: `Consulta de ${patient?.fullName} concluída. Aguardando confirmação de pagamento de R$ ${(appointment.value || 0).toFixed(2)}`,
        patientId: appointment.patientId,
        appointmentId,
        financialRecordId: transaction.id,
        priority: 'high',
        data: { patient_name: patient?.fullName, amount: appointment.value || 0, service_type: appointment.serviceType },
      },
    });

    res.json({ success: true, transaction: prismaToResponse(transaction, ['transaction_date']), message: 'Transação criada com sucesso' });
  } catch (err) {
    next(err);
  }
}
