import { prisma } from '../db.js';

// Cria automaticamente uma cobrança pendente no Financeiro quando uma sessão
// é marcada como "completed" — disparado pelo hook em entities.routes.js,
// então funciona igual não importa se veio do popup da Agenda, do Dashboard
// ou de qualquer outro lugar que mude o status do Appointment (antes só o
// Dashboard e o AppointmentForm criavam isso, deixando sessões concluídas
// pelo popup da Agenda sem nenhum registro financeiro).
//
// Antes de criar, verifica se já existe cobrança pra não duplicar:
// - Avulso (sem pacote): cobrança é por agendamento — se este agendamento já
//   tem um FinancialRecord (pago ou pendente), não cria outro.
// - Plano/pacote (packageId preenchido): a cobrança é do PACOTE inteiro, não
//   por sessão individual — se QUALQUER sessão desse mesmo pacote já gerou
//   um FinancialRecord (o paciente já pagou ou já foi cobrado no pacote),
//   as demais sessões do mesmo pacote não geram cobrança nova.
export async function createPendingIncomeForCompletedAppointment(appointment) {
  if (appointment.status !== 'completed') {
    return { skipped: true, reason: 'Agendamento não está concluído' };
  }

  if (!appointment.packageId) {
    const existing = await prisma.financialRecord.findFirst({ where: { appointmentId: appointment.id } });
    if (existing) return { skipped: true, reason: 'Cobrança já existe para este agendamento' };

    if (!appointment.value || appointment.value <= 0) {
      return { skipped: true, reason: 'Agendamento sem valor definido' };
    }

    const patient = await prisma.patient.findUnique({ where: { id: appointment.patientId } });
    const record = await prisma.financialRecord.create({
      data: {
        type: 'income',
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        professionalId: appointment.professionalId,
        description: `${appointment.serviceType || 'Consulta'} - ${patient?.fullName || 'Paciente'}`,
        amount: appointment.value,
        paymentMethod: 'pending',
        transactionDate: appointment.appointmentDate,
        paymentStatus: 'pending',
      },
    });
    return { created: true, record };
  }

  // 1) Cobrança já vinculada (via appointment_id) a qualquer sessão deste
  // mesmo pacote — já existe registro, não duplica.
  const linkedBilling = await prisma.financialRecord.findFirst({
    where: { appointment: { packageId: appointment.packageId } },
  });
  if (linkedBilling) return { skipped: true, reason: 'Este plano já teve cobrança registrada em outra sessão' };

  const pkg = await prisma.servicePackage.findUnique({ where: { id: appointment.packageId } });
  if (!pkg) return { skipped: true, reason: 'Plano não encontrado' };

  // 2) Pagamento pode ter sido lançado manualmente na contratação do plano
  // (tela "Nova Transação" no Financeiro), sem vínculo com nenhum
  // agendamento específico — busca por paciente+profissional dentro da
  // vigência do plano pra não recriar uma cobrança que o paciente já pagou.
  const unlinkedBilling = await prisma.financialRecord.findFirst({
    where: {
      type: 'income',
      appointmentId: null,
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      transactionDate: { gte: pkg.startDate },
    },
  });
  if (unlinkedBilling) {
    return { skipped: true, reason: 'Paciente já tem pagamento registrado pra este plano (lançamento manual)' };
  }

  const amount = pkg.finalValue ?? pkg.planValue;
  if (pkg.isFree || !amount || amount <= 0) {
    return { skipped: true, reason: 'Plano sem valor cobrável (gratuito ou sem preço definido)' };
  }

  const patient = await prisma.patient.findUnique({ where: { id: appointment.patientId } });
  const record = await prisma.financialRecord.create({
    data: {
      type: 'income',
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      description: `${pkg.planName} - ${patient?.fullName || 'Paciente'}`,
      amount,
      paymentMethod: 'pending',
      transactionDate: appointment.appointmentDate,
      paymentStatus: 'pending',
    },
  });
  return { created: true, record };
}
