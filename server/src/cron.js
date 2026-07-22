import cron from 'node-cron';
import { dailyNotifications } from './functions/dailyNotifications.js';
import { appointmentReminders1h } from './functions/appointmentReminders1h.js';

// Chama um handler Express fora de uma requisição HTTP real (usado pelo cron).
function runHeadless(handler, label) {
  const fakeRes = {
    json: (body) => console.log(`[cron] ${label} concluído:`, JSON.stringify(body).slice(0, 500)),
    status: () => fakeRes,
  };
  const next = (err) => {
    if (err) console.error(`[cron] ${label} falhou:`, err);
  };
  handler({}, fakeRes, next).catch(next);
}

// Substitui o disparo externo (n8n/base44 scheduled) de lembretes diários e
// avisos de pagamento pendente. Roda todo dia às 08:00 no fuso de Brasília.
export function startCronJobs() {
  cron.schedule(
    '0 8 * * *',
    () => runHeadless(dailyNotifications, 'dailyNotifications'),
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('[cron] dailyNotifications agendado para 08:00 (America/Sao_Paulo)');

  // Lembrete de 1h antes da consulta — roda a cada 15min; o dedupe fica por
  // conta da tabela Notification (ver sendOneHourAppointmentReminders).
  cron.schedule(
    '*/15 * * * *',
    () => runHeadless(appointmentReminders1h, 'appointmentReminders1h'),
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('[cron] appointmentReminders1h agendado para cada 15 minutos (America/Sao_Paulo)');
}
