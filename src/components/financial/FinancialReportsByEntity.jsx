import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus } from "lucide-react";

function fmt(v) { return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

function EntityRow({ name, paid, pending, total, count }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
        {name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{name}</p>
        <p className="text-xs text-gray-500">{count} transação(ões)</p>
      </div>
      <div className="text-right flex-shrink-0 space-y-0.5">
        <p className="text-sm font-bold text-green-600">{fmt(paid)}</p>
        {pending > 0 && <p className="text-xs text-orange-500">Pendente: {fmt(pending)}</p>}
      </div>
      <div className="text-right flex-shrink-0 w-24">
        <p className="text-sm font-bold text-gray-800 dark:text-white">{fmt(total)}</p>
        <p className="text-xs text-gray-400">Total</p>
      </div>
    </div>
  );
}

export default function FinancialReportsByEntity({ transactions, patients, professionals, isLoading }) {
  if (isLoading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;

  const incomeTransactions = transactions.filter(t => t.type === 'income');

  // Group by patient
  const byPatient = {};
  incomeTransactions.forEach(t => {
    const p = patients.find(p => p.id === t.patient_id);
    const key = t.patient_id || 'sem_paciente';
    const name = p?.full_name || 'Sem paciente';
    if (!byPatient[key]) byPatient[key] = { name, paid: 0, pending: 0, count: 0 };
    if (t.payment_status === 'paid') byPatient[key].paid += t.amount;
    else if (t.payment_status === 'pending') byPatient[key].pending += t.amount;
    byPatient[key].count += 1;
  });

  // Group by professional
  const byProfessional = {};
  incomeTransactions.forEach(t => {
    const p = professionals.find(p => p.id === t.professional_id);
    const key = t.professional_id || 'sem_prof';
    const name = p?.full_name || 'Sem profissional';
    if (!byProfessional[key]) byProfessional[key] = { name, paid: 0, pending: 0, count: 0 };
    if (t.payment_status === 'paid') byProfessional[key].paid += t.amount;
    else if (t.payment_status === 'pending') byProfessional[key].pending += t.amount;
    byProfessional[key].count += 1;
  });

  const patientRows = Object.values(byPatient).sort((a, b) => (b.paid + b.pending) - (a.paid + a.pending));
  const professionalRows = Object.values(byProfessional).sort((a, b) => (b.paid + b.pending) - (a.paid + a.pending));

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Receitas por Paciente e Profissional</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="patients">
          <TabsList className="w-full rounded-none border-b bg-gray-50 dark:bg-gray-900">
            <TabsTrigger value="patients" className="flex-1 gap-1.5 text-sm"><Users className="w-4 h-4" /> Pacientes</TabsTrigger>
            <TabsTrigger value="professionals" className="flex-1 gap-1.5 text-sm"><UserPlus className="w-4 h-4" /> Profissionais</TabsTrigger>
          </TabsList>
          <TabsContent value="patients" className="p-4">
            {patientRows.length === 0
              ? <p className="text-center text-gray-400 text-sm py-6">Nenhum dado disponível.</p>
              : patientRows.map((r, i) => <EntityRow key={i} {...r} total={r.paid + r.pending} />)}
          </TabsContent>
          <TabsContent value="professionals" className="p-4">
            {professionalRows.length === 0
              ? <p className="text-center text-gray-400 text-sm py-6">Nenhum dado disponível.</p>
              : professionalRows.map((r, i) => <EntityRow key={i} {...r} total={r.paid + r.pending} />)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}