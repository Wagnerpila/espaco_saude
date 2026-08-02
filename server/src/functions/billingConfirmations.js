import { listPendingBillingConfirmations, sendConfirmedBillingReminder } from '../services/billingConfirmation.js';

export async function listBillingConfirmations(_req, res, next) {
  try {
    const items = await listPendingBillingConfirmations();
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function confirmBillingReminder(req, res, next) {
  try {
    const { financialRecordId } = req.body || {};
    if (!financialRecordId) return res.status(400).json({ error: 'financialRecordId é obrigatório' });
    const result = await sendConfirmedBillingReminder(financialRecordId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
