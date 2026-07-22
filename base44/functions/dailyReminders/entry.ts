/**
 * Função agendada para envio de lembretes diários via n8n ou automação
 * Pode ser chamada diretamente pelo n8n via HTTP ou por uma automação scheduled
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (secret) {
    const provided = req.headers.get('x-webhook-secret');
    if (provided !== secret) {
      return Response.json({ error: 'Não autorizado' }, { status: 401, headers });
    }
  }

  const base44 = createClientFromRequest(req);

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const appointments = await base44.asServiceRole.entities.Appointment.filter({ appointment_date: today });
  const activeApts = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));

  const patients = await base44.asServiceRole.entities.Patient.list();
  const professionals = await base44.asServiceRole.entities.Professional.list();

  const reminders = activeApts.map(apt => {
    const patient = patients.find(p => p.id === apt.patient_id);
    const professional = professionals.find(p => p.id === apt.professional_id);
    if (!patient?.phone) return null;

    const phone = patient.phone.replace(/\D/g, '');
    const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`;

    const message = [
      `🔔 *Lembrete de Consulta - Clínica Espaço Saúde!*`,
      ``,
      `Olá, ${patient.full_name}! 👋`,
      `Você tem uma consulta *hoje*.`,
      ``,
      `⏰ *Horário:* ${apt.appointment_time}`,
      `👨‍⚕️ *Profissional:* ${professional?.full_name || 'A confirmar'}`,
      apt.service_type ? `🏥 *Serviço:* ${apt.service_type}` : '',
      ``,
      `Para confirmar, responda com *SIM*.`,
      `Para cancelar, responda com *CANCELAR*.`,
      `Clínica Espaço Saúde 💙`
    ].filter(Boolean).join('\n');

    return {
      appointment_id: apt.id,
      patient_name: patient.full_name,
      whatsapp_phone: phoneFormatted,
      message
    };
  }).filter(Boolean);

  console.log(`[dailyReminders] ${today}: ${reminders.length} lembretes para enviar`);

  return Response.json({
    date: today,
    total: reminders.length,
    reminders
  }, { headers });
});