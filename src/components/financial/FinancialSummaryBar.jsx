import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, BarChart2, HandCoins, CheckCircle2 } from "lucide-react";

function fmt(v) { return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

// Comissão do profissional sobre uma receita: valor x percentual cadastrado
// no profissional (mesma regra usada no relatório PDF e no PaymentModal).
function calcCommission(amount, professional) {
  const percentage = professional?.default_commission_percentage || 0;
  if (!percentage) return 0;
  return ((amount || 0) * percentage) / 100;
}

// Profissional com 100% de comissão é o dono/administrador da clínica (ex.:
// Dra. Suellen Tramontin) — o valor "recebido" por ele não é repasse a
// terceiro, então não conta como comissão paga a profissional.
function isClinicOwner(professional) {
  return professional?.default_commission_percentage === 100;
}

export default function FinancialSummaryBar({ transactions, professionals = [], professionalFilter = "all", isLoading }) {
  const scoped = professionalFilter === "all"
    ? transactions
    : transactions.filter(t => t.professional_id === professionalFilter);

  const now = new Date();
  const thisMonth = scoped.filter(t => {
    const d = t.transaction_date?.slice(0, 7);
    return d === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Transações canceladas (ex.: sessão que virou no-show/ausência depois de
  // já cobrada) nunca entram nos totais — só ficam visíveis na lista, com o
  // status "Cancelado", pra não inflar receita de algo que não aconteceu.
  const income = thisMonth.filter(t => t.type === 'income' && t.payment_status !== 'cancelled').reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === 'expense' && t.payment_status !== 'cancelled').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;
  const pending = scoped.filter(t => t.payment_status === 'pending' && t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const paid = thisMonth.filter(t => t.payment_status === 'paid' && t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const commissionPaid = thisMonth
    .filter(t => t.type === 'income' && t.payment_status === 'paid')
    .reduce((s, t) => {
      const professional = professionals.find(p => p.id === t.professional_id);
      if (isClinicOwner(professional)) return s;
      return s + calcCommission(t.amount, professional);
    }, 0);

  const cards = [
    { label: "Receitas este mês", value: income, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200" },
    { label: "Despesas este mês", value: expenses, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200" },
    { label: "Saldo do mês", value: balance, icon: Wallet, color: balance >= 0 ? "text-blue-600" : "text-red-600", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200" },
    { label: "A receber (pendente)", value: pending, icon: BarChart2, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200" },
    { label: "Pagos (mês)", value: paid, icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-200" },
    { label: "Comissão paga (mês)", value: commissionPaid, icon: HandCoins, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200" },
  ];

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, i) => (
        <Card key={i} className={`border ${c.border} ${c.bg} shadow-sm`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg}`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`text-lg font-bold ${c.color}`}>{fmt(c.value)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}