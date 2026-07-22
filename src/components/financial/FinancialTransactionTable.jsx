import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Search, Receipt, CheckCircle2 } from "lucide-react";

function formatDateBR(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const METHOD_COLORS = {
  cash: "bg-green-100 text-green-800",
  pix: "bg-blue-100 text-blue-800",
  card: "bg-purple-100 text-purple-800",
  bank_transfer: "bg-orange-100 text-orange-800",
  pending: "bg-gray-100 text-gray-600",
};

const METHOD_LABELS = {
  cash: "Dinheiro",
  pix: "PIX",
  card: "Cartão",
  bank_transfer: "Transferência",
  pending: "Pendente",
};

const STATUS_COLORS = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function FinancialTransactionTable({ transactions, patients, professionals, isLoading, onEdit, onDelete, onConfirmPayment }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  const getPatient = (id) => patients.find(p => p.id === id);
  const getProfessional = (id) => professionals.find(p => p.id === id);

  const months = [...new Set(transactions.map(t => t.transaction_date?.slice(0, 7)).filter(Boolean))].sort().reverse();

  const filtered = transactions.filter(t => {
    const pat = getPatient(t.patient_id);
    const prof = getProfessional(t.professional_id);
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      t.description?.toLowerCase().includes(searchLower) ||
      pat?.full_name?.toLowerCase().includes(searchLower) ||
      prof?.full_name?.toLowerCase().includes(searchLower);
    const matchType = filterType === "all" || t.type === filterType;
    const matchStatus = filterStatus === "all" || t.payment_status === filterStatus;
    const matchMonth = filterMonth === "all" || t.transaction_date?.startsWith(filterMonth);
    return matchSearch && matchType && matchStatus && matchMonth;
  });

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (isLoading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-5 h-5 text-green-500" />
            Transações
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input placeholder="Buscar..." className="pl-8 h-8 w-48 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mini summary */}
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-green-600 font-semibold">↑ R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span className="text-red-500 font-semibold">↓ R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span className={`font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            Saldo: R$ {(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhuma transação encontrada.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map(t => {
              const pat = getPatient(t.patient_id);
              const prof = getProfessional(t.professional_id);
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {t.type === 'income'
                      ? <ArrowUpCircle className="w-4 h-4 text-green-600" />
                      : <ArrowDownCircle className="w-4 h-4 text-red-500" />}
                  </div>

                  {/* Description + names */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{t.description || '—'}</p>
                    <div className="flex gap-2 text-xs text-gray-500 flex-wrap">
                      {pat && <span>👤 {pat.full_name}</span>}
                      {prof && <span>👨‍⚕️ {prof.full_name}</span>}
                      <span>📅 {formatDateBR(t.transaction_date)}</span>
                    </div>
                  </div>

                  {/* Method badge */}
                  <Badge className={`text-xs ${METHOD_COLORS[t.payment_method] || 'bg-gray-100 text-gray-600'}`}>
                    {METHOD_LABELS[t.payment_method] || t.payment_method || '—'}
                  </Badge>

                  {/* Status badge */}
                  <Badge className={`text-xs ${STATUS_COLORS[t.payment_status] || 'bg-gray-100 text-gray-500'}`}>
                    {t.payment_status === 'paid' ? 'Pago' : t.payment_status === 'pending' ? 'Pendente' : 'Cancelado'}
                  </Badge>

                  {/* Value */}
                  <span className={`text-sm font-bold w-28 text-right flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    {t.payment_status === 'pending' && onConfirmPayment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Confirmar pagamento"
                        onClick={() => { if (confirm(`Confirmar pagamento de R$ ${t.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) onConfirmPayment(t); }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(t)}>
                      <Edit className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('Excluir transação?')) onDelete(t.id); }}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}