import { prisma } from '../db.js';
import { prismaToResponse } from '../utils/case.js';

export async function closeMonthlyCommissions(req, res, next) {
  try {
    const { month, year, professional_id } = req.body || {};
    if (!month || !year) return res.status(400).json({ error: 'Mês e ano são obrigatórios' });

    const existing = await prisma.monthlyClosing.findFirst({
      where: { month: Number(month), year: Number(year), professionalId: professional_id || null },
    });
    if (existing?.status === 'closed') {
      return res.status(400).json({ error: 'Já existe um fechamento para este período', closing: prismaToResponse(existing, ['closing_date']) });
    }

    const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));

    const allCommissions = await prisma.commission.findMany({
      where: { ...(professional_id ? { professionalId: professional_id } : {}), monthlyClosingId: null },
    });
    const commissions = allCommissions.filter((c) => {
      const d = new Date(c.serviceDate);
      return d >= startDate && d <= endDate;
    });

    const totalAppointments = commissions.length;
    const totalRevenue = commissions.reduce((sum, c) => sum + (c.serviceValue || 0), 0);
    const totalCommission = commissions.reduce((sum, c) => sum + (c.commissionValue || 0), 0);

    const closing = await prisma.monthlyClosing.create({
      data: {
        month: Number(month),
        year: Number(year),
        professionalId: professional_id || null,
        totalAppointments,
        totalRevenue,
        totalCommission,
        status: 'closed',
        closingDate: new Date(),
        commissionIds: commissions.map((c) => c.id),
      },
    });

    await prisma.commission.updateMany({
      where: { id: { in: commissions.map((c) => c.id) } },
      data: { monthlyClosingId: closing.id },
    });

    res.json({
      success: true,
      closing: prismaToResponse(closing, ['closing_date']),
      commissions_count: commissions.length,
      message: 'Fechamento realizado com sucesso',
    });
  } catch (err) {
    next(err);
  }
}
