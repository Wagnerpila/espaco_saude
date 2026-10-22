import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Patient, Appointment, FinancialRecord, Professional, Room } from "@/entities/all";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, EyeOff } from "lucide-react";
import { createPageUrl } from "@/utils";
import { usePendingBillingConfirmations } from "@/hooks/usePendingBillingConfirmations";
import TodaySchedule from "../components/dashboard/TodaySchedule";
import { PendingCard, WeekStripCard, PatientsCard, MonthReportCard } from "../components/dashboard/DashboardCards";

// Preferência de ocultar o valor do dia (como o "exibir" do Master UP) —
// só conveniência visual, por aparelho.
const HIDE_MONEY_KEY = "dashboard_hide_money";

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [financialRecords, setFinancialRecords] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hideMoney, setHideMoney] = useState(() => {
    try { return localStorage.getItem(HIDE_MONEY_KEY) === "true"; } catch { return false; }
  });
  const { count: pendingBillingCount } = usePendingBillingConfirmations(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [patientsData, appointmentsData, financialData, professionalsData, roomsData] = await Promise.all([
        Patient.list(),
        Appointment.list(),
        FinancialRecord.list(),
        Professional.list(),
        Room.list(),
      ]);
      setProfessionals(professionalsData);
      setRooms(roomsData);
      setPatients(patientsData);
      setAllAppointments(appointmentsData);
      setFinancialRecords(financialData);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    }
    setIsLoading(false);
  };

  const toggleHideMoney = () => {
    setHideMoney(v => {
      try { localStorage.setItem(HIDE_MONEY_KEY, String(!v)); } catch { /* ignora */ }
      return !v;
    });
  };

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = allAppointments
    .filter(apt => apt.appointment_date === todayKey)
    .map(apt => ({ ...apt, patient: patients.find(p => p.id === apt.patient_id) }));
  const todayCount = todayAppointments.filter(a => a.status !== "cancelled").length;
  const todayRevenue = financialRecords
    .filter(r => r.type === "income" && r.payment_status === "paid" && String(r.transaction_date).slice(0, 10) === todayKey)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-app">
      {/* Topo em degradê: resumo de hoje + atalhos */}
      <section className="bg-brand-gradient text-white px-5 pt-5 pb-6 md:rounded-b-3xl">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <p className="text-white/85 text-lg capitalize">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
            <button onClick={toggleHideMoney} className="text-white/80 text-sm flex items-center gap-1" aria-label={hideMoney ? "Mostrar valor" : "Ocultar valor"}>
              {hideMoney ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {hideMoney ? "exibir" : "ocultar"}
            </button>
          </div>

          <div className="flex items-end justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-6xl font-light leading-none">{isLoading ? "–" : todayCount}</span>
              <span className="text-white/85 leading-tight">atendim.<br />hoje</span>
            </div>
            <span className="text-4xl font-light">
              {isLoading ? "" : hideMoney ? "R$ •••" : `R$ ${todayRevenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <Link to={`${createPageUrl("Schedule")}?novo=1`} className="text-center rounded-full border-2 border-white/70 py-2.5 text-[15px] hover:bg-white/10">
              novo agendamento
            </Link>
            <Link to={createPageUrl("Schedule")} className="text-center rounded-full bg-white/25 border-2 border-white/70 py-2.5 text-[15px] hover:bg-white/30">
              agenda
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-3 md:px-6 py-3 md:py-6 grid gap-3 md:gap-4 md:grid-cols-2">
        <PendingCard appointments={allAppointments} pendingBillingCount={pendingBillingCount} />
        <WeekStripCard appointments={allAppointments} />
        <div className="md:col-span-2">
          <TodaySchedule
            appointments={todayAppointments}
            patients={patients}
            professionals={professionals}
            rooms={rooms}
            isLoading={isLoading}
            onRefresh={loadDashboardData}
          />
        </div>
        <PatientsCard patients={patients} appointments={allAppointments} />
        <MonthReportCard appointments={allAppointments} financialRecords={financialRecords} />
      </div>
    </div>
  );
}
