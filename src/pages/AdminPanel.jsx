import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Patient, Professional, Appointment } from "@/entities/all";
import {
  Users,
  UserCheck,
  Calendar,
  Shield,
  Activity,
  Database,
  Settings,
  FileText,
  MessageCircle,
  CalendarOff,
  ChevronRight
} from "lucide-react";
import WhatsAppMessageSender from "@/components/admin/WhatsAppMessageSender";
import WhatsAppMessageTemplates from "@/components/admin/WhatsAppMessageTemplates";
import AppointmentConfirmationOverrides from "@/components/admin/AppointmentConfirmationOverrides";
import HolidayScheduleManager from "@/components/admin/HolidayScheduleManager";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalProfessionals: 0,
    totalAppointments: 0,
    pendingAppointments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [patientsData, professionalsData, appointmentsData] = await Promise.all([
        Patient.list(),
        Professional.list(),
        Appointment.list()
      ]);

      setPatients(patientsData);
      setProfessionals(professionalsData);
      setAppointments(appointmentsData);

      setStats({
        totalUsers: patientsData.length + professionalsData.length,
        totalPatients: patientsData.length,
        totalProfessionals: professionalsData.length,
        totalAppointments: appointmentsData.length,
        pendingAppointments: appointmentsData.filter(apt => apt.status === 'pending').length
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  // Configurações agrupadas em cartões com ícone colorido (estilo Master UP).
  // Itens com `href` levam a outra página; com `action` abrem uma ferramenta
  // aqui mesmo.
  const settingsGroups = [
    {
      title: "Clínica",
      items: [
        { title: "Serviços, planos e salas", icon: Settings, href: "/ServiceConfiguration", color: "#f59e0b" },
        { title: "Profissionais e horários", icon: UserCheck, href: "/Professionals", color: "#3b82f6" },
        { title: "Cadastros clínicos", subtitle: "Prontuários, aparelhos e exercícios", icon: Activity, href: "/ClinicalRegistration", color: "#ec4899" },
        { title: "Feriados e bloqueio de agenda", icon: CalendarOff, action: "holidays", color: "#ef4444" },
      ],
    },
    {
      title: "Mensagens ao paciente",
      items: [
        { title: "Modelos de mensagens", subtitle: "Textos automáticos do WhatsApp", icon: FileText, action: "whatsapp-templates", color: "#22c55e" },
        { title: "Enviar mensagem de teste", icon: MessageCircle, action: "whatsapp", color: "#14b8a6" },
      ],
    },
    {
      title: "Acesso",
      items: [
        { title: "Usuários", icon: Users, href: "/UserManagement", color: "#6366f1" },
        { title: "Permissões", icon: Shield, href: "/UserPermissions", color: "#64748b" },
      ],
    },
    {
      title: "Atalhos",
      items: [
        { title: "Pacientes", icon: Users, href: "/Patients", color: "#0ea5e9" },
        { title: "Agenda geral", icon: Calendar, href: "/Schedule", color: "#a855f7" },
        { title: "Financeiro", icon: Database, href: "/Financial", color: "#f97316" },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="p-3 md:p-6 bg-app min-h-screen">
        <div className="max-w-2xl mx-auto animate-pulse space-y-3">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-white dark:bg-gray-900 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const subPage = (title, content) => (
    <div className="p-3 md:p-6 bg-app min-h-screen">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2 text-brand mb-4 font-medium"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Configurações
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
        {content}
      </div>
    </div>
  );

  if (activeTab === 'whatsapp') return subPage("Enviar mensagem de teste", <WhatsAppMessageSender />);
  if (activeTab === 'whatsapp-templates') {
    return subPage("Modelos de mensagens", (
      <div className="space-y-6">
        <WhatsAppMessageTemplates />
        <AppointmentConfirmationOverrides />
      </div>
    ));
  }
  if (activeTab === 'holidays') return subPage("Feriados e bloqueio de agenda", <HolidayScheduleManager />);

  return (
    <div className="p-3 md:p-6 bg-app min-h-screen">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Resumo da clínica */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Clínica Espaço Saúde</p>
              <p className="text-sm text-gray-500">Configurações do sistema</p>
            </div>
          </div>
          <div className="grid grid-cols-4 mt-4 text-center divide-x divide-gray-100 dark:divide-gray-800">
            {[
              { label: "pacientes", value: stats.totalPatients },
              { label: "profission.", value: stats.totalProfessionals },
              { label: "agendam.", value: stats.totalAppointments },
              { label: "pendentes", value: stats.pendingAppointments },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {settingsGroups.map(group => (
          <div key={group.title}>
            <p className="px-4 pb-1.5 text-xs uppercase tracking-wider text-gray-500">{group.title}</p>
            <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
              {group.items.map((item, i) => (
                <button
                  key={item.title}
                  onClick={() => item.href ? navigate(item.href) : setActiveTab(item.action)}
                  className="w-full flex items-center gap-3 pl-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: item.color }}>
                    <item.icon className="w-4 h-4" />
                  </span>
                  <span className={`flex-1 flex items-center gap-2 pr-4 py-3 min-w-0 ${i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] text-gray-900 dark:text-white">{item.title}</span>
                      {item.subtitle && <span className="block text-xs text-gray-500 truncate">{item.subtitle}</span>}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
