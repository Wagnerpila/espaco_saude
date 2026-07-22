import { generateCommissionForAppointment } from '../services/commissions.js';
import { prismaToResponse } from '../utils/case.js';

export async function generateCommission(req, res, next) {
  try {
    const { appointment_id } = req.body || {};
    if (!appointment_id) return res.status(400).json({ error: 'appointment_id é obrigatório' });

    const result = await generateCommissionForAppointment(appointment_id);
    if (result.error) return res.status(result.status || 500).json({ error: result.error });
    if (result.commission) result.commission = prismaToResponse(result.commission, ['payment_date', 'service_date']);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
