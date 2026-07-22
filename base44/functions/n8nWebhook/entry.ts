/**
 * Webhook para integração com n8n
 * 
 * Ações disponíveis (passar no body como "action"):
 * 
 * 📋 PACIENTES
 *   - find_patient_by_cpf     → { cpf }
 *   - register_patient        → { full_name, cpf, phone, email?, birth_date?, medical_notes? }
 * 
 * 📅 AGENDA
 *   - get_professionals       → {}
 *   - get_available_slots     → { date, professional_id? }
 *   - check_availability      → { date, time, professional_id?, duration? }
 *   - create_appointment      → { patient_id, professional_id, room_id, date, time, service_type?, duration?, notes? }
 *   - get_appointment         → { appointment_id }
 *   - cancel_appointment      → { appointment_id, reason? }
 * 
 * 🔔 LEMBRETES
 *   - send_reminders_today    → {} (envia lembretes para consultas do dia)
 *   - send_single_reminder    → { appointment_id }
 * 
 * Autenticação: Header "x-webhook-secret" com o valor configurado em WEBHOOK_SECRET
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Horários de funcionamento padrão
const WORK_HOURS = {
  start: 7,
  end: 20,
  slotMinutes: 60
};

const DAYS_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function normalizeCpf(cpf) {
  return cpf ? cpf.replace(/\D/g, '') : '';
}

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function generateSlots(date, workStart = 7, workEnd = 20, slotMin = 60) {
  const slots = [];
  for (let h = workStart; h < workEnd; h++) {
    for (let m = 0; m < 60; m += slotMin) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isSlotBusy(slotTime, appointments, duration = 60) {
  const slotMin = timeToMinutes(slotTime);
  return appointments.some(apt => {
    if (['cancelled', 'null_absence'].includes(apt.status)) return false;
    const aptMin = timeToMinutes(apt.appointment_time);
    const aptDur = apt.duration || 60;
    return slotMin < aptMin + aptDur && slotMin + duration > aptMin;
  });
}

function isProfessionalWorkingOnDay(professional, date) {
  if (!professional.working_hours) return true; // se não configurado, assume que trabalha
  const dayIndex = new Date(date + 'T12:00:00').getDay();
  const dayKey = DAYS_EN[dayIndex];
  const wh = professional.working_hours[dayKey];
  return wh?.active === true;
}

function getProfessionalWorkHours(professional, date) {
  if (!professional.working_hours) return { start: WORK_HOURS.start, end: WORK_HOURS.end };
  const dayIndex = new Date(date + 'T12:00:00').getDay();
  const dayKey = DAYS_EN[dayIndex];
  const wh = professional.working_hours[dayKey];
  if (!wh?.active) return null;
  const [sh, sm] = (wh.start || '07:00').split(':').map(Number);
  const [eh, em] = (wh.end || '20:00').split(':').map(Number);
  return { start: sh + sm / 60, end: eh + em / 60 };
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret'
      }
    });
  }

  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  // Autenticação por secret
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (secret) {
    const provided = req.headers.get('x-webhook-secret');
    if (provided !== secret) {
      return Response.json({ error: 'Não autorizado' }, { status: 401, headers });
    }
  }

  const base44 = createClientFromRequest(req);

  let body = {};
  try {
    body = await req.json();
  } catch (_) {}

  const { action, ...params } = body;

  try {
    // ─────────────────────────────────────────────────────
    // PACIENTES
    // ─────────────────────────────────────────────────────

    if (action === 'find_patient_by_cpf') {
      const { cpf } = params;
      if (!cpf) return Response.json({ error: 'CPF obrigatório' }, { status: 400, headers });
      const normalized = normalizeCpf(cpf);
      const patients = await base44.asServiceRole.entities.Patient.list();
      const found = patients.find(p => normalizeCpf(p.cpf) === normalized);
      if (!found) {
        return Response.json({ found: false, message: 'Paciente não encontrado' }, { headers });
      }
      return Response.json({ found: true, patient: found }, { headers });
    }

    if (action === 'register_patient') {
      const { full_name, cpf, phone, email, birth_date, medical_notes } = params;
      if (!full_name || !phone) {
        return Response.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400, headers });
      }
      // Check if CPF already exists
      if (cpf) {
        const all = await base44.asServiceRole.entities.Patient.list();
        const dup = all.find(p => normalizeCpf(p.cpf) === normalizeCpf(cpf));
        if (dup) {
          return Response.json({ success: false, error: 'CPF já cadastrado', patient: dup }, { headers });
        }
      }
      const patient = await base44.asServiceRole.entities.Patient.create({
        full_name,
        cpf: cpf ? normalizeCpf(cpf) : undefined,
        phone,
        email,
        birth_date,
        medical_notes,
        active: true
      });
      return Response.json({ success: true, patient, message: `Paciente ${full_name} cadastrado com sucesso!` }, { headers });
    }

    // ─────────────────────────────────────────────────────
    // AGENDA
    // ─────────────────────────────────────────────────────

    if (action === 'get_professionals') {
      const professionals = await base44.asServiceRole.entities.Professional.list();
      const active = professionals.filter(p => p.active !== false);
      return Response.json({
        professionals: active.map(p => ({
          id: p.id,
          full_name: p.full_name,
          specialty: p.specialty,
          phone: p.phone,
          email: p.email
        }))
      }, { headers });
    }

    if (action === 'get_available_slots') {
      const { date, professional_id, duration = 60 } = params;
      if (!date) return Response.json({ error: 'Data obrigatória (YYYY-MM-DD)' }, { status: 400, headers });

      const professionals = professional_id
        ? [(await base44.asServiceRole.entities.Professional.filter({ id: professional_id }))[0]]
        : (await base44.asServiceRole.entities.Professional.list()).filter(p => p.active !== false);

      const rooms = await base44.asServiceRole.entities.Room.list();
      const dayAppointments = await base44.asServiceRole.entities.Appointment.filter({ appointment_date: date });

      const result = [];

      for (const prof of professionals) {
        if (!prof) continue;
        const workHours = getProfessionalWorkHours(prof, date);
        if (!workHours) continue; // não trabalha neste dia

        const profAppointments = dayAppointments.filter(a => a.professional_id === prof.id);
        const slots = generateSlots(date, workHours.start, workHours.end, duration);
        const availableSlots = slots.filter(slot => !isSlotBusy(slot, profAppointments, duration));

        result.push({
          professional_id: prof.id,
          professional_name: prof.full_name,
          specialty: prof.specialty,
          date,
          available_slots: availableSlots,
          total_available: availableSlots.length
        });
      }

      return Response.json({ date, results: result }, { headers });
    }

    if (action === 'check_availability') {
      const { date, time, professional_id, room_id, duration = 60 } = params;
      if (!date || !time) {
        return Response.json({ error: 'Data e horário são obrigatórios' }, { status: 400, headers });
      }

      const dayAppointments = await base44.asServiceRole.entities.Appointment.filter({ appointment_date: date });

      // Check professional availability
      let profAvailable = true;
      let profInfo = null;
      let suggestedProfessionals = [];

      if (professional_id) {
        const profApts = dayAppointments.filter(a => a.professional_id === professional_id);
        profAvailable = !isSlotBusy(time, profApts, duration);
        const professionals = await base44.asServiceRole.entities.Professional.list();
        profInfo = professionals.find(p => p.id === professional_id);
      } else {
        // Suggest available professionals
        const professionals = (await base44.asServiceRole.entities.Professional.list()).filter(p => p.active !== false);
        for (const prof of professionals) {
          const wh = getProfessionalWorkHours(prof, date);
          if (!wh) continue;
          const profApts = dayAppointments.filter(a => a.professional_id === prof.id);
          if (!isSlotBusy(time, profApts, duration)) {
            suggestedProfessionals.push({ id: prof.id, full_name: prof.full_name, specialty: prof.specialty });
          }
        }
      }

      // Check room availability
      let roomAvailable = true;
      let availableRooms = [];
      const rooms = await base44.asServiceRole.entities.Room.list();

      if (room_id) {
        const roomApts = dayAppointments.filter(a => a.room_id === room_id);
        const room = rooms.find(r => r.id === room_id);
        const capacity = room?.capacity || 1;
        const concurrent = roomApts.filter(a => isSlotBusy(time, [a], duration)).length;
        roomAvailable = concurrent < capacity;
      } else {
        // Find available rooms
        for (const room of rooms.filter(r => r.active !== false)) {
          const roomApts = dayAppointments.filter(a => a.room_id === room.id);
          const concurrent = roomApts.filter(a => !['cancelled', 'null_absence'].includes(a.status) && isSlotBusy(time, [a], duration)).length;
          if (concurrent < (room.capacity || 1)) {
            availableRooms.push({ id: room.id, room_name: room.room_name, room_type: room.room_type });
          }
        }
      }

      const isAvailable = (professional_id ? profAvailable : suggestedProfessionals.length > 0)
        && (room_id ? roomAvailable : availableRooms.length > 0);

      return Response.json({
        available: isAvailable,
        date,
        time,
        duration,
        professional: profInfo ? { id: profInfo.id, full_name: profInfo.full_name, specialty: profInfo.specialty, available: profAvailable } : null,
        suggested_professionals: suggestedProfessionals,
        room_available: roomAvailable,
        available_rooms: availableRooms,
        message: isAvailable
          ? `Horário ${time} disponível em ${date}`
          : `Horário ${time} em ${date} não está disponível`
      }, { headers });
    }

    if (action === 'create_appointment') {
      const { patient_id, professional_id, room_id, date, time, service_type, duration = 60, notes, value } = params;
      if (!patient_id || !professional_id || !date || !time) {
        return Response.json({ error: 'patient_id, professional_id, data e horário são obrigatórios' }, { status: 400, headers });
      }

      // Final availability check
      const dayAppointments = await base44.asServiceRole.entities.Appointment.filter({ appointment_date: date });
      const profApts = dayAppointments.filter(a => a.professional_id === professional_id);
      if (isSlotBusy(time, profApts, duration)) {
        return Response.json({ success: false, error: 'Profissional não disponível neste horário' }, { headers });
      }

      if (room_id) {
        const rooms = await base44.asServiceRole.entities.Room.list();
        const room = rooms.find(r => r.id === room_id);
        const roomApts = dayAppointments.filter(a => a.room_id === room_id);
        const concurrent = roomApts.filter(a => !['cancelled', 'null_absence'].includes(a.status) && isSlotBusy(time, [a], duration)).length;
        if (concurrent >= (room?.capacity || 1)) {
          return Response.json({ success: false, error: 'Sala não disponível neste horário' }, { headers });
        }
      }

      const appointment = await base44.asServiceRole.entities.Appointment.create({
        patient_id,
        professional_id,
        room_id: room_id || undefined,
        appointment_date: date,
        appointment_time: time,
        duration,
        status: 'confirmed',
        service_type: service_type || '',
        notes: notes || '',
        value: value || undefined,
        payment_status: 'pending'
      });

      // Get patient info for response
      const patients = await base44.asServiceRole.entities.Patient.list();
      const patient = patients.find(p => p.id === patient_id);
      const professionals = await base44.asServiceRole.entities.Professional.list();
      const professional = professionals.find(p => p.id === professional_id);

      return Response.json({
        success: true,
        appointment,
        patient: patient ? { full_name: patient.full_name, phone: patient.phone } : null,
        professional: professional ? { full_name: professional.full_name, specialty: professional.specialty } : null,
        message: `Consulta agendada para ${date} às ${time}`,
        whatsapp_message: patient ? [
          `✅ *Consulta Confirmada!*`,
          ``,
          `Olá, ${patient.full_name}!`,
          `Sua consulta foi agendada com sucesso.`,
          ``,
          `📅 *Data:* ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`,
          `⏰ *Horário:* ${time}`,
          `👨‍⚕️ *Profissional:* ${professional?.full_name || 'A confirmar'}`,
          service_type ? `🏥 *Serviço:* ${service_type}` : '',
          ``,
          `Em caso de dúvidas, entre em contato conosco.`,
          `Clínica Espaço Saúde 💙`
        ].filter(Boolean).join('\n') : null
      }, { headers });
    }

    if (action === 'get_appointment') {
      const { appointment_id } = params;
      if (!appointment_id) return Response.json({ error: 'appointment_id obrigatório' }, { status: 400, headers });
      const appointments = await base44.asServiceRole.entities.Appointment.filter({ id: appointment_id });
      if (!appointments.length) return Response.json({ error: 'Agendamento não encontrado' }, { status: 404, headers });
      const apt = appointments[0];

      const [patients, professionals, rooms] = await Promise.all([
        base44.asServiceRole.entities.Patient.list(),
        base44.asServiceRole.entities.Professional.list(),
        base44.asServiceRole.entities.Room.list()
      ]);

      return Response.json({
        appointment: apt,
        patient: patients.find(p => p.id === apt.patient_id) || null,
        professional: professionals.find(p => p.id === apt.professional_id) || null,
        room: rooms.find(r => r.id === apt.room_id) || null
      }, { headers });
    }

    if (action === 'cancel_appointment') {
      const { appointment_id, reason } = params;
      if (!appointment_id) return Response.json({ error: 'appointment_id obrigatório' }, { status: 400, headers });
      await base44.asServiceRole.entities.Appointment.update(appointment_id, {
        status: 'cancelled',
        notes: reason ? `Cancelado via WhatsApp: ${reason}` : 'Cancelado via WhatsApp'
      });
      return Response.json({ success: true, message: 'Consulta cancelada com sucesso' }, { headers });
    }

    // ─────────────────────────────────────────────────────
    // LEMBRETES
    // ─────────────────────────────────────────────────────

    if (action === 'send_reminders_today') {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const appointments = await base44.asServiceRole.entities.Appointment.filter({ appointment_date: today });
      const activeApts = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));

      const patients = await base44.asServiceRole.entities.Patient.list();
      const professionals = await base44.asServiceRole.entities.Professional.list();

      const reminders = activeApts.map(apt => {
        const patient = patients.find(p => p.id === apt.patient_id);
        const professional = professionals.find(p => p.id === apt.professional_id);
        if (!patient?.phone) return null;

        const phone = formatPhone(patient.phone);
        const message = [
          `🔔 *Lembrete de Consulta!*`,
          ``,
          `Olá, ${patient.full_name}! 👋`,
          `Você tem uma consulta *hoje* na Clínica Espaço Saúde.`,
          ``,
          `⏰ *Horário:* ${apt.appointment_time}`,
          `👨‍⚕️ *Profissional:* ${professional?.full_name || 'A confirmar'}`,
          apt.service_type ? `🏥 *Serviço:* ${apt.service_type}` : '',
          ``,
          `📍 Não se esqueça de comparecer no horário marcado.`,
          ``,
          `Para cancelar ou reagendar, responda esta mensagem.`,
          `Clínica Espaço Saúde 💙`
        ].filter(Boolean).join('\n');

        return {
          appointment_id: apt.id,
          patient_name: patient.full_name,
          patient_phone: patient.phone,
          whatsapp_phone: phone,
          time: apt.appointment_time,
          professional: professional?.full_name,
          whatsapp_message: message,
          whatsapp_url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        };
      }).filter(Boolean);

      return Response.json({
        date: today,
        total_appointments: activeApts.length,
        reminders_to_send: reminders.length,
        reminders
      }, { headers });
    }

    if (action === 'send_single_reminder') {
      const { appointment_id } = params;
      if (!appointment_id) return Response.json({ error: 'appointment_id obrigatório' }, { status: 400, headers });

      const appointments = await base44.asServiceRole.entities.Appointment.filter({ id: appointment_id });
      if (!appointments.length) return Response.json({ error: 'Agendamento não encontrado' }, { status: 404, headers });
      const apt = appointments[0];

      const patients = await base44.asServiceRole.entities.Patient.list();
      const professionals = await base44.asServiceRole.entities.Professional.list();
      const patient = patients.find(p => p.id === apt.patient_id);
      const professional = professionals.find(p => p.id === apt.professional_id);

      if (!patient?.phone) return Response.json({ error: 'Paciente sem telefone cadastrado' }, { status: 400, headers });

      const phone = formatPhone(patient.phone);
      const aptDate = new Date(apt.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long'
      });

      const message = [
        `🔔 *Lembrete de Consulta!*`,
        ``,
        `Olá, ${patient.full_name}! 👋`,
        `Sua consulta na Clínica Espaço Saúde está se aproximando.`,
        ``,
        `📅 *Data:* ${aptDate}`,
        `⏰ *Horário:* ${apt.appointment_time}`,
        `👨‍⚕️ *Profissional:* ${professional?.full_name || 'A confirmar'}`,
        apt.service_type ? `🏥 *Serviço:* ${apt.service_type}` : '',
        ``,
        `Para cancelar ou reagendar, responda esta mensagem.`,
        `Clínica Espaço Saúde 💙`
      ].filter(Boolean).join('\n');

      return Response.json({
        patient_name: patient.full_name,
        patient_phone: patient.phone,
        whatsapp_phone: phone,
        whatsapp_message: message,
        whatsapp_url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      }, { headers });
    }

    // ─────────────────────────────────────────────────────
    // AÇÃO DESCONHECIDA
    // ─────────────────────────────────────────────────────

    return Response.json({
      error: 'Ação não reconhecida',
      available_actions: [
        'find_patient_by_cpf', 'register_patient',
        'get_professionals', 'get_available_slots', 'check_availability',
        'create_appointment', 'get_appointment', 'cancel_appointment',
        'send_reminders_today', 'send_single_reminder'
      ]
    }, { status: 400, headers });

  } catch (error) {
    console.error('[n8nWebhook] Error:', error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
});