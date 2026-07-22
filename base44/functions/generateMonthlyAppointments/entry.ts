import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Mapeia nome do dia da semana para número JS (0=Dom, 1=Seg, ...)
const dayNameToNumber = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      package_id,
      patient_id,
      professional_id,
      room_id,
      fixed_days,         // array: ["monday", "wednesday"]
      day_times,          // objeto: { monday: "09:00", wednesday: "10:00" }
      start_date,         // "YYYY-MM-DD"
      duration = 60,
      service_type = "",
      notes = ""
    } = await req.json();

    if (!package_id || !patient_id || !professional_id || !fixed_days?.length || !start_date) {
      return Response.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    const start = new Date(start_date + 'T00:00:00');
    // Gera agendamentos para o mês inteiro a partir de start_date
    const year = start.getFullYear();
    const month = start.getMonth();
    const endOfMonth = new Date(year, month + 1, 0); // último dia do mês

    const created = [];
    const current = new Date(start);

    while (current <= endOfMonth) {
      const dayName = Object.entries(dayNameToNumber).find(([, n]) => n === current.getDay())?.[0];
      
      if (dayName && fixed_days.includes(dayName)) {
        const time = day_times?.[dayName] || "09:00";
        const dateStr = current.toISOString().split('T')[0];

        // Verificar se já existe agendamento para este paciente nesta data/hora
        const existing = await base44.asServiceRole.entities.Appointment.filter({
          patient_id,
          appointment_date: dateStr,
          appointment_time: time
        });

        if (existing.length === 0) {
          const apt = await base44.asServiceRole.entities.Appointment.create({
            patient_id,
            professional_id,
            room_id: room_id || null,
            appointment_date: dateStr,
            appointment_time: time,
            duration,
            status: "pending",
            service_type,
            notes: notes || "Agendamento automático via plano recorrente",
            payment_status: "pending",
            package_id
          });
          created.push(apt);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return Response.json({
      success: true,
      created_count: created.length,
      appointments: created,
      message: `${created.length} agendamento(s) criado(s) para o mês`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});