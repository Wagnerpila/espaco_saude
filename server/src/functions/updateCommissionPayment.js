import { prisma } from '../db.js';

export async function updateCommissionPayment(req, res, next) {
  try {
    const { commission_ids, payment_status, payment_date } = req.body || {};
    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return res.status(400).json({ error: 'commission_ids é obrigatório e deve ser um array' });
    }

    const status = payment_status || 'paid';
    const data = { paymentStatus: status };
    if (payment_date) data.paymentDate = new Date(payment_date);
    else if (status === 'paid') data.paymentDate = new Date();

    const result = await prisma.commission.updateMany({ where: { id: { in: commission_ids } }, data });

    res.json({ success: true, updated_count: result.count, message: `${result.count} comissão(ões) atualizada(s)` });
  } catch (err) {
    next(err);
  }
}
