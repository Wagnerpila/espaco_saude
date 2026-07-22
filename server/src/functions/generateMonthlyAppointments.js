import { prisma } from '../db.js';
import { prismaToResponse } from '../utils/case.js';

const DAY_NAME_TO_NUMBER = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

export async function generateMonthlyAppointments(req, res, next) {
  try {
    const {
      package_id,
      patient_id,
      professional_id,
      room_id,
      fixed_days,
      day_times,
      start_date,
      duration = 60,
      service_type = '',
      notes = '',
    } = req.body || {};

    if (!package_id || !patient_id || !professional_id || !fixed_days?.length || !start_date) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios faltando' });
    }

    const start = new Date(`${start_date}T00:00:00`);
    const year = start.getFullYear();
    const month = start.getMonth();
    const endOfMonth = new Date(year, month + 1, 0);

    const created = [];
    const current = new Date(start);

    while (current <= endOfMonth) {
      const dayName = Object.entries(DAY_NAME_TO_NUMBER).find(([, n]) => n === current.getDay())?.[0];

      if (dayName && fixed_days.includes(dayName)) {
        const time = day_times?.[dayName] || '09:00';
        const dateStr = current.toISOString().slice(0, 10);

        const existing = await prisma.appointment.findFirst({
          where: { patientId: patient_id, appointmentDate: new Date(dateStr), appointmentTime: time },
        });

        if (!existing) {
          const apt = await prisma.appointment.create({
            data: {
              patientId: patient_id,
              professionalId: professional_id,
              roomId: room_id || null,
              appointmentDate: new Date(dateStr),
              appointmentTime: time,
              duration,
              status: 'pending',
              serviceType: service_type,
              notes: notes || 'Agendamento automático via plano recorrente',
              paymentStatus: 'pending',
              packageId: package_id,
            },
          });
          created.push(apt);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      created_count: created.length,
      appointments: created.map((a) => prismaToResponse(a, ['appointment_date'])),
      message: `${created.length} agendamento(s) criado(s) para o mês`,
    });
  } catch (err) {
    next(err);
  }
}
