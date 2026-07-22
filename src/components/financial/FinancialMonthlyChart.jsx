import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FinancialMonthlyChart({ transactions, isLoading }) {
  if (isLoading) return <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />;

  const monthly = {};
  transactions.forEach(t => {
    const m = t.transaction_date?.slice(0, 7);
    if (!m) return;
    if (!monthly[m]) monthly[m] = { month: m, income: 0, expenses: 0, balance: 0 };
    if (t.type === 'income') monthly[m].income += t.amount;
    else monthly[m].expenses += t.amount;
  });
  const data = Object.values(monthly)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map(d => ({
      ...d,
      balance: d.income - d.expenses,
      label: MONTH_NAMES[parseInt(d.month.split('-')[1]) - 1] + '/' + d.month.split('-')[0].slice(2)
    }));

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Receitas vs Despesas — Últimos 6 meses
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={v => `R$ ${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, n) => [fmt(v), n === 'income' ? 'Receitas' : n === 'expenses' ? 'Despesas' : 'Saldo']} />
              <Legend formatter={v => v === 'income' ? 'Receitas' : v === 'expenses' ? 'Despesas' : 'Saldo'} />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="balance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}