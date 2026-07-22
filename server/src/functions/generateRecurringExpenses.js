import { prisma } from '../db.js';

function addOneMonth(date) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

// Despesas fixas recorrentes (ex.: aluguel) não têm uma entidade "modelo"
// separada — cada mês é sua própria linha em financial_records marcada
// is_recurring=true. Para saber qual é a "última" ocorrência de cada série
// (já que não há um id de série), agrupamos por descrição+categoria+valor+
// paciente/profissional vinculado, pegamos a de due_date mais recente, e
// geramos a próxima automaticamente quando o vencimento dela já passou.
export async function generateRecurringExpenses(req, res, next) {
  try {
    const recurring = await prisma.financialRecord.findMany({
      where: { isRecurring: true, type: 'expense', dueDate: { not: null } },
      orderBy: { dueDate: 'desc' },
    });

    const latestBySeries = new Map();
    for (const r of recurring) {
      const key = `${r.description}|${r.category}|${r.amount}|${r.patientId || ''}|${r.professionalId || ''}`;
      if (!latestBySeries.has(key)) latestBySeries.set(key, r);
    }

    const now = new Date();
    const created = [];

    for (const latest of latestBySeries.values()) {
      const nextDue = addOneMonth(latest.dueDate);
      if (nextDue > now) continue;

      const alreadyExists = await prisma.financialRecord.findFirst({
        where: {
          description: latest.description,
          category: latest.category,
          amount: latest.amount,
          patientId: latest.patientId,
          professionalId: latest.professionalId,
          dueDate: nextDue,
        },
      });
      if (alreadyExists) continue;

      const created_record = await prisma.financialRecord.create({
        data: {
          type: 'expense',
          description: latest.description,
          amount: latest.amount,
          paymentMethod: latest.paymentMethod,
          paymentStatus: 'pending',
          transactionDate: nextDue,
          dueDate: nextDue,
          category: latest.category,
          notes: latest.notes,
          isRecurring: true,
          patientId: latest.patientId,
          professionalId: latest.professionalId,
        },
      });
      created.push(created_record);
    }

    res.json({ success: true, created_count: created.length });
  } catch (err) {
    next(err);
  }
}
