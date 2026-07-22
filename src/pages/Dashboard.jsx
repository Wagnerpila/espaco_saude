import React, { useState, useEffect } from "react";
import { Patient, Appointment, FinancialRecord } from "@/entities/all";
import { Calendar, Users, DollarSign, CheckCircle, TrendingUp, Activity } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import DashboardStats from "../components/dashboard/DashboardStats";
import TodaySchedule from "../components/dashboard/TodaySchedule";
import WeeklyOverview from "../components/dashboard/WeeklyOverview";
import RecentPatients from "../components/dashboard/RecentPatients";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    completedToday: 0,
    weeklyRevenue: 0,
    pendingRevenue: 0,
    completedThisWeek: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState([]); // New state for all appointments

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      // Load basic stats
      const patients = await Patient.list();
      const appointmentsData = await Appointment.list(); // Fetch all appointments
      setAllAppointments(appointmentsData); // Save all appointments to state
      const financialRecords = await FinancialRecord.list();

      // Filter today's appointments
      const todayAppts = appointmentsData.filter(apt => 
        apt.appointment_date === format(today, 'yyyy-MM-dd')
      );
      const completedToday = todayAppts.filter(apt => apt.status === 'completed').length;

      // Filter this week's completed appointments
      const weekAppointments = appointmentsData.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= weekStart && aptDate <= weekEnd && apt.status === 'completed';
      });

      // Calculate weekly revenue (paid)
      const weeklyRevenue = financialRecords
        .filter(record => {
          const recordDate = new Date(record.transaction_date);
          return record.type === 'income' && recordDate >= weekStart && recordDate <= weekEnd && record.payment_status === 'paid';
        })
        .reduce((sum, record) => sum + record.amount, 0);

      // Calculate pending revenue
      const pendingRevenue = financialRecords
        .filter(record => record.type === 'income' && record.payment_status === 'pending')
        .reduce((sum, record) => sum + record.amount, 0);

      setStats({
        totalPatients: patients.length,
        todayAppointments: todayAppts.length,
        completedToday,
        weeklyRevenue,
        pendingRevenue,
        completedThisWeek: weekAppointments.length
      });

      // Populate today's appointments with patient data
      const populatedTodayAppts = todayAppts.map(apt => ({
        ...apt,
        patient: patients.find(p => p.id === apt.patient_id)
      }));

      setTodayAppointments(populatedTodayAppts);
      setRecentPatients(patients.slice(0, 5));
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-purple-50 via-orange-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-600 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              Painel
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Cards Modernos - Inspirado no SeuFisio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {/* Atendimentos */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Calendar className="w-6 h-6" />
                </div>
                <Activity className="w-4 h-4 opacity-70" />
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium opacity-90">Atendimentos</p>
                <p className="text-3xl md:text-4xl font-bold">
                  {isLoading ? "..." : stats.todayAppointments}
                </p>
                <p className="text-xs opacity-80">Agendados hoje</p>
              </div>
            </CardContent>
          </Card>

          {/* Realizados */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-700 text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <TrendingUp className="w-4 h-4 opacity-70" />
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium opacity-90">Realizados</p>
                <p className="text-3xl md:text-4xl font-bold">
                  {isLoading ? "..." : stats.completedToday}
                </p>
                <p className="text-xs opacity-80">Finalizados hoje</p>
              </div>
            </CardContent>
          </Card>

          {/* Receita Paga */}
          <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <DollarSign className="w-6 h-6" />
                </div>
                <CheckCircle className="w-4 h-4 opacity-70" />
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium opacity-90">Pago</p>
                <p className="text-2xl md:text-3xl font-bold">
                  {isLoading ? "..." : `R$ ${stats.weeklyRevenue.toFixed(2).replace('.', ',')}`}
                </p>
                <p className="text-xs opacity-80">Receita semanal</p>
              </div>
            </CardContent>
          </Card>

          {/* A Receber */}
          <Card className="bg-gradient-to-br from-pink-500 to-pink-700 text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <Activity className="w-4 h-4 opacity-70" />
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium opacity-90">Pendente</p>
                <p className="text-2xl md:text-3xl font-bold">
                  {isLoading ? "..." : `R$ ${stats.pendingRevenue.toFixed(2).replace('.', ',')}`}
                </p>
                <p className="text-xs opacity-80">A receber</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TodaySchedule 
              appointments={todayAppointments}
              allAppointments={allAppointments}
              isLoading={isLoading}
              onRefresh={loadDashboardData}
            />
            <WeeklyOverview appointments={allAppointments} isLoading={isLoading} />
          </div>

          <div>
            <RecentPatients 
              patients={recentPatients}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}