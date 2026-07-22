import React, { useState, useEffect } from "react";
import { Patient, Professional, Appointment } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ChevronRight
} from "lucide-react";
import WhatsAppMessageSender from "@/components/admin/WhatsAppMessageSender";
import WhatsAppMessageTemplates from "@/components/admin/WhatsAppMessageTemplates";

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

  const quickActions = [
    {
      title: "Gerenciar Pacientes",
      description: "Visualizar, editar e adicionar pacientes",
      icon: Users,
      href: "/Patients",
      color: "bg-blue-500"
    },
    {
      title: "Gerenciar Profissionais",
      description: "Controlar acesso e permissões",
      icon: UserCheck,
      href: "/Professionals",
      color: "bg-green-500"
    },
    {
      title: "Configurar Serviços",
      description: "Cadastrar planos, valores e salas",
      icon: Settings,
      href: "/ServiceConfiguration",
      color: "bg-purple-500"
    },
    {
      title: "Cadastros Clínicos",
      description: "Prontuários, aparelhos e exercícios",
      icon: Activity,
      href: "/ClinicalRegistration",
      color: "bg-pink-500"
    },
    {
      title: "Agenda Geral",
      description: "Visualizar todos os agendamentos",
      icon: Calendar,
      href: "/Schedule",
      color: "bg-pink-500"
    },
    {
      title: "Controle Financeiro",
      description: "Relatórios e transações",
      icon: Database,
      href: "/Financial",
      color: "bg-orange-500"
    },
    {
      title: "Enviar Mensagens WhatsApp",
      description: "Enviar mensagens para pacientes (teste)",
      icon: MessageCircle,
      action: 'whatsapp',
      color: "bg-green-500"
    },
    {
      title: "Editar Mensagens do Bot",
      description: "Personalizar os textos automáticos do WhatsApp",
      icon: FileText,
      action: 'whatsapp-templates',
      color: "bg-teal-500"
    }
  ];

  if (isLoading) {
    return (
      <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'whatsapp') {
    return (
      <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 font-medium"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Voltar ao Painel
          </button>
          <WhatsAppMessageSender />
        </div>
      </div>
    );
  }

  if (activeTab === 'whatsapp-templates') {
    return (
      <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 font-medium"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Voltar ao Painel
          </button>
          <WhatsAppMessageTemplates />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
              <p className="text-gray-600 dark:text-gray-400">Controle total do sistema Espaço Saúde</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Usuários</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Pacientes</p>
                  <p className="text-3xl font-bold">{stats.totalPatients}</p>
                </div>
                <Users className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Profissionais</p>
                  <p className="text-3xl font-bold">{stats.totalProfessionals}</p>
                </div>
                <UserCheck className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Agendamentos</p>
                  <p className="text-3xl font-bold">{stats.totalAppointments}</p>
                </div>
                <Calendar className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6" onClick={() => action.href ? window.location.href = action.href : action.action && setActiveTab(action.action)}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${action.color} bg-opacity-20`}>
                      <action.icon className={`w-6 h-6 ${action.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{action.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.pendingAppointments > 0 && (
                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium dark:text-white">Agendamentos Pendentes</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stats.pendingAppointments} agendamentos aguardando confirmação</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {stats.pendingAppointments}
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium dark:text-white">Sistema Operacional</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Todos os módulos funcionando corretamente</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  ✓ OK
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}