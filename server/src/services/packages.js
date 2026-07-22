import { prisma } from '../db.js';

// Porte de base44/functions/onAppointmentCompleted — incrementa
// sessions_used do pacote do paciente quando um atendimento é concluído,
// e alerta quando o ciclo de sessões contratadas termina.
export async function incrementPackageSessionsForAppointment(appointment) {
  if (!appointment?.packageId) return { message: 'Sem plano vinculado, nenhuma ação necessária' };

  const pkg = await prisma.servicePackage.findUnique({ where: { id: appointment.packageId } });
  if (!pkg || pkg.status !== 'active') return { message: 'Pacote não ativo' };

  const newSessionsUsed = (pkg.sessionsUsed || 0) + 1;
  const maxSessions = pkg.sessionsPerCycle || pkg.maxSessions || 0;
  const cycleComplete = maxSessions > 0 && newSessionsUsed >= maxSessions;

  await prisma.servicePackage.update({
    where: { id: pkg.id },
    data: { sessionsUsed: newSessionsUsed, ...(cycleComplete ? { status: 'completed' } : {}) },
  });

  if (cycleComplete) {
    const patient = await prisma.patient.findUnique({ where: { id: appointment.patientId } });
    await prisma.notification.create({
      data: {
        type: 'system_alert',
        title: `Renovação necessária: ${pkg.planName}`,
        message: `O paciente ${patient?.fullName || 'N/A'} concluiu todas as ${maxSessions} sessões do plano "${pkg.planName}". Entre em contato para renovação.`,
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        status: 'unread',
        priority: 'high',
      },
    });
  }

  return { success: true, sessions_used: newSessionsUsed, max_sessions: maxSessions, cycle_complete: cycleComplete };
}
