import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const HOLIDAYS_2026 = [
  { date: "2026-01-01", reason: "Ano Novo (Nacional)" },
  { date: "2026-03-19", reason: "São José (Municipal - Imbaú)" },
  { date: "2026-04-03", reason: "Sexta-Feira Santa (Nacional)" },
  { date: "2026-04-21", reason: "Tiradentes (Nacional)" },
  { date: "2026-05-01", reason: "Dia do Trabalho (Nacional)" },
  { date: "2026-09-07", reason: "Independência do Brasil (Nacional)" },
  { date: "2026-10-12", reason: "Nossa Senhora Aparecida (Nacional)" },
  { date: "2026-11-02", reason: "Dia de Finados (Nacional)" },
  { date: "2026-11-15", reason: "Proclamação da República (Nacional)" },
  { date: "2026-11-20", reason: "Consciência Negra (Nacional)" },
  { date: "2026-12-08", reason: "Feriado Municipal - Imbaú" },
  { date: "2026-12-25", reason: "Natal (Nacional)" },
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const professionalId = body?.event?.entity_id || body?.professional_id;

  if (!professionalId) {
    return Response.json({ error: "professional_id é obrigatório" }, { status: 400 });
  }

  const blocks = HOLIDAYS_2026.map(h => ({
    professional_id: professionalId,
    block_type: "full_day",
    start_date: h.date,
    end_date: h.date,
    reason: h.reason,
    active: true,
  }));

  const results = await base44.asServiceRole.entities.ScheduleBlock.bulkCreate(blocks);

  return Response.json({ success: true, created: results.length });
});