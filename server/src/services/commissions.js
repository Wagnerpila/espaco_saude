import { prisma } from '../db.js';

// Porte de base44/functions/generateCommission — chamado automaticamente
// quando um Appointment passa a status 'completed' (ver hook em
// entities.routes.js) e também disponível como endpoint manual.
export async function generateCommissionForAppointment(appointmentId) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return { error: 'Atendimento não encontrado', status: 404 };

  if (appointment.status !== 'completed') {
    return { message: 'Comissão não gerada - atendimento não finalizado', status: appointment.status };
  }

  const existing = await prisma.commission.findFirst({ where: { appointmentId } });
  if (existing) {
    return { message: 'Comissão já existe para este atendimento', commission: existing };
  }

  const professional = await prisma.professional.findUnique({ where: { id: appointment.professionalId } });
  if (!professional) return { error: 'Profissional não encontrado', status: 404 };

  let commissionPercentage = professional.defaultCommissionPercentage || 0;

  if (appointment.serviceType) {
    const plan = await prisma.servicePlan.findFirst({ where: { planName: appointment.serviceType } });
    if (plan?.commissionPercentage) commissionPercentage = plan.commissionPercentage;
  }

  const serviceValue = appointment.value || 0;
  const commissionValue = (serviceValue * commissionPercentage) / 100;

  const commission = await prisma.commission.create({
    data: {
      appointmentId: appointment.id,
      professionalId: appointment.professionalId,
      patientId: appointment.patientId,
      serviceName: appointment.serviceType || 'Atendimento',
      serviceValue,
      commissionPercentage,
      commissionValue,
      paymentStatus: 'pending',
      serviceDate: appointment.appointmentDate,
    },
  });

  return { success: true, commission, message: 'Comissão gerada com sucesso' };
}
