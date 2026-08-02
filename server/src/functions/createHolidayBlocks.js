import { ensureHolidayBlocksForProfessional } from '../services/holidays.js';

// Cria os bloqueios de feriado (nacionais + municipais de Imbaú/PR) para um
// único profissional — chamado automaticamente ao cadastrar um profissional
// novo (ver hook em routes/entities.routes.js) e também disponível como
// endpoint manual/admin.
export async function createHolidayBlocks(req, res, next) {
  try {
    const professionalId = req.body?.professional_id;
    if (!professionalId) return res.status(400).json({ error: 'professional_id é obrigatório' });

    const { created } = await ensureHolidayBlocksForProfessional(professionalId);
    res.json({ success: true, created });
  } catch (err) {
    next(err);
  }
}
