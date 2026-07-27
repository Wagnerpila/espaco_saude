import { prisma } from '../db.js';
import { createPendingIncomeForCompletedAppointment } from '../services/appointmentBilling.js';

// Correção pontual pra agendamentos que já estavam "completed" ANTES do hook
// automático de cobrança existir (ver services/appointmentBilling.js) — o
// hook só dispara numa mudança de status, então sessões finalizadas antes do
// deploy dessa funcionalidade nunca passaram por ele. Roda a mesma lógica
// (com as mesmas checagens de pagamento já feito) pros agendamentos de hoje.
export async function backfillTodayCompletedBilling(req, res, next) {
  try {
    const todayIso = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const appointments = await prisma.appointment.findMany({
      where: { status: 'completed', appointmentDate: new Date(todayIso) },
    });

    const results = [];
    for (const apt of appointments) {
      const patient = await prisma.patient.findUnique({ where: { id: apt.patientId } });
      const result = await createPendingIncomeForCompletedAppointment(apt);
      results.push({ appointment_id: apt.id, patient_name: patient?.fullName, time: apt.appointmentTime, ...result });
    }

    res.json({
      success: true,
      date: todayIso,
      total_completed_today: appointments.length,
      created: results.filter((r) => r.created).length,
      skipped: results.filter((r) => r.skipped).length,
      results,
    });
  } catch (err) {
    next(err);
  }
}
