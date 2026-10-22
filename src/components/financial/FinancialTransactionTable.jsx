import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Search, Receipt, CheckCircle2, X, Banknote, Smartphone, CreditCard, Building2 } from "lucide-react";
import { getAttendanceStatus, ATTENDANCE_COLORS } from "@/utils/financialExport";

const PAYMENT_METHODS = [
  { key: "pix", label: "PIX", icon: Smartphone },
  { key: "cash", label: "Dinheiro", icon: Banknote },
  { key: "card", label: "Cartão", icon: CreditCard },
  { key: "bank_transfer", label: "Transferência", icon: Building2 },
];

function formatDateBR(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_COLORS = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-500",
};

// Comissão do profissional sobre uma receita: valor x percentual cadastrado
// no profissional (mesma regra do relatório PDF e do PaymentModal).
function calcCommission(amount, professional) {
  const percentage = professional?.default_commission_percentage || 0;
  if (!percentage) return 0;
  return ((amount || 0) * percentage) / 100;
}

// Profissional com 100% de comissão é o dono/administrador da clínica —
// não é repasse a terceiro, então não entra como "comissão".
function isClinicOwner(professional) {
  return professional?.default_commission_percentage === 100;
}

const ATTENDANCE_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "attended", label: "Compareceu" },
  { value: "scheduled", label: "Agendado" },
  { value: "no_show", label: "Não Compareceu" },
  { value: "justified_absence", label: "Ausência Justificada" },
  { value: "professional_absence", label: "Ausência Profissional" },
  { value: "null_absence", label: "Ausência Nula" },
  { value: "cancelled", label: "Agend. Cancelado" },
];

export default function FinancialTransactionTable({
  transactions, patients, professionals, appointments = [], isLoading, onEdit, onDelete, onConfirmPayment,
  professionalFilter, onProfessionalFilterChange,
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterDay, setFilterDay] = useState("");
  const [filterAttendance, setFilterAttendance] = useState("all");
  const [confirmingTx, setConfirmingTx] = useState(null);
  const [confirmMethod, setConfirmMethod] = useState("pix");
  const filterProfessional = professionalFilter ?? "all";
  const setFilterProfessional = onProfessionalFilterChange ?? (() => {});

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
    const matchDay = !filterDay || t.transaction_date === filterDay;
    const matchProfessional = filterProfessional === "all" || t.professional_id === filterProfessional;
    const attendanceKey = getAttendanceStatus(t, appointments)?.key || "attended";
    const matchAttendance = filterAttendance === "all" || attendanceKey === filterAttendance;
    return matchSearch && matchType && matchStatus && matchMonth && matchDay && matchProfessional && matchAttendance;
  });

  // Cancelado (sessão que não aconteceu) nunca soma nos totais — só aparece
  // na lista com o status "Cancelado" pra rastreabilidade.
  const totalIncome = filtered.filter(t => t.type === 'income' && t.payment_status !== 'cancelled').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense' && t.payment_status !== 'cancelled').reduce((s, t) => s + t.amount, 0);

  if (isLoading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="w-5 h-5 text-green-500" />
          Transações
          <span className="text-sm font-normal text-gray-400">({filtered.length})</span>
        </CardTitle>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar paciente, profissional ou descrição" className="pl-9 h-10 w-full text-sm rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filtros: rolam para o lado no celular */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-2 pb-1 -mx-1 px-1">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-8 w-auto min-w-[8.5rem] shrink-0 text-xs rounded-full"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative shrink-0">
            <Input
              type="date"
              value={filterDay}
              onChange={e => setFilterDay(e.target.value)}
              className="h-8 w-36 text-xs pr-7 rounded-full"
              title="Filtrar por dia"
            />
            {filterDay && (
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Limpar filtro de dia"
                onClick={() => setFilterDay("")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-auto min-w-[7rem] shrink-0 text-xs rounded-full"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Receitas e despesas</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-auto min-w-[7rem] shrink-0 text-xs rounded-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAttendance} onValueChange={setFilterAttendance}>
            <SelectTrigger className="h-8 w-auto min-w-[9rem] shrink-0 text-xs rounded-full"><SelectValue placeholder="Comparecimento" /></SelectTrigger>
            <SelectContent>
              {ATTENDANCE_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProfessional} onValueChange={setFilterProfessional}>
            <SelectTrigger className="h-8 w-auto min-w-[10rem] shrink-0 text-xs rounded-full"><SelectValue placeholder="Profissional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Resumo do que está filtrado */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 py-2">
            <p className="text-[11px] text-green-700 dark:text-green-400">Entradas</p>
            <p className="text-sm font-bold text-green-600 tabular-nums">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 py-2">
            <p className="text-[11px] text-red-600 dark:text-red-400">Saídas</p>
            <p className="text-sm font-bold text-red-500 tabular-nums">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 py-2">
            <p className="text-[11px] text-gray-500">Saldo</p>
            <p className={`text-sm font-bold tabular-nums ${(totalIncome - totalExpense) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              R$ {(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
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
              const hasCommission = t.type === 'income' && t.payment_status !== 'cancelled' && prof?.default_commission_percentage > 0 && !isClinicOwner(prof);
              const commission = hasCommission ? calcCommission(t.amount, prof) : 0;
              const attendance = getAttendanceStatus(t, appointments);
              const attendanceColor = attendance ? ATTENDANCE_COLORS[attendance.key]?.badge : null;
              const income = t.type === 'income';
              // Nome do paciente em destaque; sem paciente (ex.: despesa), a
              // descrição vira o título e não se repete embaixo.
              const title = pat?.full_name || t.description || '—';
              const subtitle = pat ? t.description : null;
              return (
                <div key={t.id} className={`flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors ${t.payment_status === 'cancelled' ? 'opacity-60' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${income ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {income
                      ? <ArrowUpCircle className="w-5 h-5 text-green-600" />
                      : <ArrowDownCircle className="w-5 h-5 text-red-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 min-w-0 text-[15px] font-semibold text-gray-900 dark:text-white leading-snug break-words">{title}</p>
                      <span className={`text-[15px] font-bold whitespace-nowrap tabular-nums ${income ? 'text-green-600' : 'text-red-500'}`}>
                        {income ? '+' : '−'} R$ {t.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {subtitle && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug break-words mt-0.5">{subtitle}</p>
                    )}

                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDateBR(t.transaction_date)}</span>
                      {prof && <span className="truncate max-w-[60%]">{prof.full_name}</span>}
                      {/* Status — quando há agendamento vinculado, mostra a
                          situação real da sessão (não compareceu/ausência/
                          agendado) no lugar de "Pendente" genérico */}
                      <Badge className={`text-[11px] font-medium ${attendanceColor || STATUS_COLORS[t.payment_status] || 'bg-gray-100 text-gray-500'}`}>
                        {attendance ? attendance.label : (t.payment_status === 'paid' ? 'Pago' : t.payment_status === 'pending' ? 'Pendente' : 'Cancelado')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      {hasCommission ? (
                        <p className="flex-1 text-xs text-purple-600 dark:text-purple-400">
                          Comissão: R$ {commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({prof.default_commission_percentage}%)
                        </p>
                      ) : <span className="flex-1" />}
                      {t.payment_status === 'pending' && !attendance && onConfirmPayment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-green-600 text-xs"
                          title="Confirmar pagamento"
                          onClick={() => {
                            setConfirmMethod(t.payment_method && t.payment_method !== 'pending' ? t.payment_method : 'pix');
                            setConfirmingTx(t);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Receber
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => onEdit(t)}>
                        <Edit className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Excluir" onClick={() => { if (confirm('Excluir transação?')) onDelete(t.id); }}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {confirmingTx && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmingTx(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">Confirmar Pagamento</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmingTx(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{confirmingTx.description || '—'}</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  R$ {confirmingTx.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-medium block mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setConfirmMethod(m.key)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                          ${confirmMethod === m.key ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}
                      >
                        <Icon className="w-4 h-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-11"
                onClick={() => {
                  onConfirmPayment(confirmingTx, confirmMethod);
                  setConfirmingTx(null);
                }}
              >
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}