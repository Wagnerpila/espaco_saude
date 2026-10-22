import React from "react";
import { Link } from "react-router-dom";
import { format, addDays, startOfWeek, isSameDay, parseISO, subMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell, CalendarDays, Users, PieChart, Sparkles, Moon, Cake, BarChart3, Wallet, Clock, ShoppingBasket, ChevronRight
} from "lucide-react";
import { createPageUrl } from "@/utils";

// Cartões do painel inicial (estilo Master UP): cada um tem um ícone colorido,
// um número grande, um título curto e, opcionalmente, um link "VER".

const brl = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const ACTIVE_STATUSES = new Set(["pending", "confirmed", "completed"]);
const INACTIVE_AFTER_DAYS = 60;

function CardShell({ children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, color, number, title, linkTo, linkLabel = "VER" }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="w-7 h-7 flex-shrink-0" style={{ color }} />
      {number !== undefined && (
        <span className="text-4xl font-light leading-none" style={{ color }}>{number}</span>
      )}
      <span className="flex-1 text-[15px] leading-tight whitespace-pre-line" style={{ color }}>{title}</span>
      {linkTo && (
        <Link to={linkTo} className="text-sm font-semibold text-brand">{linkLabel}</Link>
      )}
    </div>
  );
}

function Row({ icon: Icon, iconBg, label, values, to }) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: iconBg }}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 text-[15px] text-gray-800 dark:text-gray-100">{label}</span>
      {values.map((v, i) => (
        <span key={i} className="w-14 text-right text-[15px] text-gray-700 dark:text-gray-200 tabular-nums">{v}</span>
      ))}
      {to && <ChevronRight className="w-4 h-4 text-gray-300" />}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

// Pendências: agendamentos futuros ainda sem confirmação do paciente e
// cobranças aguardando o OK do admin (mesma contagem do badge do menu).
export function PendingCard({ appointments, pendingBillingCount }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const awaiting = appointments.filter(a => a.status === "pending" && a.appointment_date >= today).length;
  const total = awaiting + (pendingBillingCount || 0);
  return (
    <CardShell>
      <CardHeader icon={Bell} color="#e53965" number={total} title={"pendências\nde hoje em diante"} />
      {total > 0 && (
        <>
          {awaiting > 0 && <Row icon={Clock} iconBg="#3b82f6" label="Aguardando confirmação" values={[awaiting]} to={createPageUrl("Schedule")} />}
          {pendingBillingCount > 0 && <Row icon={Wallet} iconBg="#f59e0b" label="Cobranças para aprovar" values={[pendingBillingCount]} to={createPageUrl("Financial")} />}
        </>
      )}
    </CardShell>
  );
}

// Semana atual em miniatura: quantos atendimentos em cada dia. Tocar num dia
// abre a agenda já naquela data.
export function WeekStripCard({ appointments }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const countByDay = days.map(d => {
    const key = format(d, "yyyy-MM-dd");
    return appointments.filter(a => a.appointment_date === key && a.status !== "cancelled").length;
  });
  const total = countByDay.reduce((s, n) => s + n, 0);

  return (
    <CardShell>
      <CardHeader icon={CalendarDays} color="#8e3fae" number={total} title={"atendimentos\ndesta semana"} linkTo={createPageUrl("Schedule")} linkLabel="AGENDA" />
      <div className="px-4 pb-1 flex items-center justify-between">
        <span className="font-semibold text-gray-900 dark:text-white capitalize">{format(today, "MMMM", { locale: ptBR })}</span>
      </div>
      <div className="grid grid-cols-7 px-2 pb-3">
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <Link key={i} to={`${createPageUrl("Schedule")}?date=${format(d, "yyyy-MM-dd")}`} className="flex flex-col items-center py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <span className="text-xs text-gray-500 uppercase">{format(d, "EEEEE", { locale: ptBR })}</span>
              <span className={`text-xl ${isToday ? "font-bold text-brand" : weekend ? "text-pink-500" : "text-gray-600 dark:text-gray-300"}`}>{format(d, "d")}</span>
              <span className="text-xs text-gray-400 tabular-nums">{countByDay[i]}</span>
            </Link>
          );
        })}
      </div>
    </CardShell>
  );
}

// Pacientes: total, novos (mês atual × anterior), inativos (sem atendimento
// há 60+ dias e sem nada marcado) e aniversariantes do mês.
export function PatientsCard({ patients, appointments }) {
  const now = new Date();
  const thisMonth = format(now, "yyyy-MM");
  const lastMonth = format(subMonths(now, 1), "yyyy-MM");
  const active = patients.filter(p => p.active !== false);

  const created = (p) => (p.created_date || "").slice(0, 7);
  const newThis = active.filter(p => created(p) === thisMonth).length;
  const newLast = active.filter(p => created(p) === lastMonth).length;

  const todayKey = format(now, "yyyy-MM-dd");
  const lastVisit = {};
  const hasFuture = new Set();
  for (const a of appointments) {
    if (!ACTIVE_STATUSES.has(a.status)) continue;
    if (a.appointment_date >= todayKey) hasFuture.add(a.patient_id);
    else if (!lastVisit[a.patient_id] || a.appointment_date > lastVisit[a.patient_id]) lastVisit[a.patient_id] = a.appointment_date;
  }
  const inactive = active.filter(p =>
    lastVisit[p.id] && !hasFuture.has(p.id) && differenceInDays(now, parseISO(lastVisit[p.id])) >= INACTIVE_AFTER_DAYS
  ).length;

  const monthNum = format(now, "MM");
  const birthdays = active.filter(p => p.birth_date && String(p.birth_date).slice(5, 7) === monthNum).length;

  return (
    <CardShell>
      <CardHeader icon={Users} color="#139c8f" number={active.length} title={"pacientes\nativos"} linkTo={createPageUrl("Patients")} />
      <div className="flex justify-end gap-0 px-4 pb-1 text-sm text-gray-400">
        <span className="w-14 text-right capitalize">{format(subMonths(now, 1), "MMM", { locale: ptBR })}</span>
        <span className="w-14 text-right capitalize">{format(now, "MMM", { locale: ptBR })}</span>
        <span className="w-4" />
      </div>
      <Row icon={Sparkles} iconBg="#3a8fb7" label="Pacientes novos" values={[newLast, newThis]} to={createPageUrl("Patients")} />
      <Row icon={Moon} iconBg="#3f51b5" label={`Inativos (${INACTIVE_AFTER_DAYS}+ dias)`} values={["", inactive]} to={createPageUrl("Patients")} />
      <Row icon={Cake} iconBg="#f5a623" label="Aniversariantes do mês" values={["", birthdays]} to={createPageUrl("Patients")} />
    </CardShell>
  );
}

// Resumo financeiro do mês: previsto (agenda) × realizado (recebido) ×
// a receber × despesas, como o "Relatórios" do painel do Master UP.
export function MonthReportCard({ appointments, financialRecords }) {
  const now = new Date();
  const month = format(now, "yyyy-MM");
  const inMonth = (d) => String(d || "").slice(0, 7) === month;

  const monthAppts = appointments.filter(a => inMonth(a.appointment_date) && a.status !== "cancelled");
  const projected = monthAppts.reduce((s, a) => s + (Number(a.value) || 0), 0);
  const done = monthAppts.filter(a => a.status === "completed");

  const income = financialRecords.filter(r => r.type === "income" && inMonth(r.transaction_date));
  const received = income.filter(r => r.payment_status === "paid");
  const pending = income.filter(r => r.payment_status === "pending");
  const expenses = financialRecords.filter(r => r.type === "expense" && inMonth(r.transaction_date) && r.payment_status !== "cancelled");

  const sum = (list) => list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const total = sum(received) - sum(expenses);

  return (
    <CardShell>
      <CardHeader icon={PieChart} color="#1aa3e0" title="Relatórios" linkTo={createPageUrl("Financial")} />
      <div className="flex items-center px-4 pb-1 text-sm">
        <span className="flex-1 font-semibold text-gray-900 dark:text-white capitalize">{format(now, "MMMM", { locale: ptBR })}:</span>
        <span className="w-24 text-right text-gray-400">qtd.</span>
        <span className="w-28 text-right text-gray-400">soma</span>
      </div>
      {[
        { icon: BarChart3, bg: "#5f7d8c", label: "Previsto", qty: monthAppts.length, value: projected },
        { icon: Wallet, bg: "#3bb54a", label: "Recebido", qty: received.length, value: sum(received) },
        { icon: Clock, bg: "#f5c518", label: "A receber", qty: pending.length, value: sum(pending) },
        { icon: ShoppingBasket, bg: "#16b6d0", label: "Despesas", qty: expenses.length, value: sum(expenses) },
      ].map(r => (
        <div key={r.label} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: r.bg }}>
            <r.icon className="w-4 h-4" />
          </span>
          <span className="flex-1 text-[15px] text-gray-800 dark:text-gray-100">{r.label}:</span>
          <span className="w-12 text-right text-gray-500 tabular-nums">{r.qty}</span>
          <span className="w-28 text-right text-gray-900 dark:text-white tabular-nums">{brl(r.value)}</span>
        </div>
      ))}
      <div className="flex items-center px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <span className="flex-1 font-bold text-gray-900 dark:text-white">Total:</span>
        <span className={`font-bold tabular-nums ${total < 0 ? "text-red-600" : "text-gray-900 dark:text-white"}`}>{brl(total)}</span>
      </div>
      <p className="px-4 pb-3 -mt-1 text-xs text-gray-400">Recebido − despesas · {done.length} atendimento(s) finalizado(s) no mês</p>
    </CardShell>
  );
}
