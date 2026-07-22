
import React, { useState, useEffect } from "react";
import { Appointment, Patient, Professional, MedicalRecord } from "@/entities/all";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  User as UserIcon,
  FileText,
  Download,
  Heart,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  DollarSign, // Added for financial summary
  MessageCircle // Added for request payment button
} from "lucide-react";
import { format } from "date-fns"; // Corrected syntax: 'from' instead of '='
import { ptBR } from "date-fns/locale";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800"
};

const statusLabels = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído"
};

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [financialSummary, setFinancialSummary] = useState({ paid: 0, pending: 0 }); // Added financial summary state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      console.log("Usuário logado:", user.email); // Debug

      // Get patient data - buscar SOMENTE pelo email do usuário logado
      const patients = await Patient.list();
      console.log("Todos os pacientes:", patients); // Debug

      // Buscar paciente com o MESMO email do usuário logado
      const patient = patients.find(p => p.email === user.email);
      console.log("Paciente encontrado:", patient); // Debug

      if (!patient) {
        console.log("Nenhum paciente encontrado com o email:", user.email); // Debug
        setPatientData(null);
        setIsLoading(false);
        return;
      }

      setPatientData(patient);

      if (patient) {
        // Load all financial records for the patient first
        const { FinancialRecord } = await import("@/entities/all"); // Dynamic import
        const financialRecords = await FinancialRecord.filter({ patient_id: patient.id });

        // Load appointments for this patient
        const allAppointments = await Appointment.list("-appointment_date");
        let patientAppointments = allAppointments.filter(apt => apt.patient_id === patient.id);

        // Enrich appointments with financial data (payment_status, value, service_type)
        patientAppointments = patientAppointments.map(apt => {
          const matchingFinancialRecord = financialRecords.find(fr => fr.appointment_id === apt.id);
          return {
            ...apt,
            payment_status: matchingFinancialRecord?.payment_status || 'not_applicable',
            value: matchingFinancialRecord?.amount || 0,
            service_type: matchingFinancialRecord?.description || 'Consulta' // Assuming description in FinancialRecord can be service type
          };
        });

        setAppointments(patientAppointments);

        // Calculate financial summary from the fetched financial records
        const summary = financialRecords.reduce((acc, record) => {
          if (record.payment_status === 'paid') {
            acc.paid += record.amount;
          } else if (record.payment_status === 'pending') {
            acc.pending += record.amount;
          }
          return acc;
        }, { paid: 0, pending: 0 });

        setFinancialSummary(summary);

        // Load medical records for this patient
        const allRecords = await MedicalRecord.list("-session_date");
        const patientRecords = allRecords.filter(record => record.patient_id === patient.id);
        setMedicalRecords(patientRecords);
      }

      // Load professionals
      const professionalsData = await Professional.list();
      setProfessionals(professionalsData);
    } catch (error) {
      console.error("Erro ao carregar dados do paciente:", error);
    }
    setIsLoading(false);
  };

  const getProfessionalName = (professionalId) => {
    const professional = professionals.find(p => p.id === professionalId);
    return professional?.full_name || 'Profissional não encontrado';
  };

  const getProfessionalSpecialty = (professionalId) => {
    const professional = professionals.find(p => p.id === professionalId);
    return professional?.specialty || '';
  };

  const upcomingAppointments = appointments.filter(apt => {
    const today = new Date();
    const aptDate = new Date(apt.appointment_date + 'T00:00:00'); // Garantir timezone correto

    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    aptDate.setHours(0, 0, 0, 0);

    // Include today and future dates, exclude cancelled
    const isUpcoming = aptDate >= today && apt.status !== 'cancelled';

    return isUpcoming;
  });

  const pastAppointments = appointments.filter(apt => {
    const today = new Date();
    const aptDate = new Date(apt.appointment_date + 'T00:00:00'); // Garantir timezone correto

    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    aptDate.setHours(0, 0, 0, 0);

    // Past dates or completed status
    return aptDate < today || apt.status === 'completed';
  });

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.href = '/';
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const handleRequestPayment = () => {
    if (!patientData?.phone) {
      alert("Seu número de telefone não está cadastrado. Por favor, entre em contato com a clínica para solicitar opções de pagamento.");
      return;
    }

    // Mensagem diferente - paciente solicitando dados bancários para pagar
    const message = `🏥 *Espaço Saúde* 🏥

Olá! Sou ${patientData.full_name}.

Gostaria de realizar o pagamento das minhas consultas no valor de *R$ ${financialSummary.pending.toFixed(2).replace('.', ',')}*.

Poderiam me enviar os dados bancários para transferência?

*Formas de pagamento de preferência:*
• PIX
• Transferência bancária 
• Dados da conta

Aguardo retorno para efetuar o pagamento.

Obrigado(a)!
💙 Estética • Fisioterapia • Pilates`;

    const phoneNumber = patientData.phone.replace(/\D/g, '');
    const clinicWhatsappNumber = '5511999999999'; // Substituir pelo número real da clínica
    const whatsappUrl = `https://wa.me/${clinicWhatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Bem-vindo ao Espaço Saúde!
            </h2>
            <p className="text-gray-600 mb-4">
              Para acessar seus agendamentos e prontuários, é necessário que você seja cadastrado como paciente em nosso sistema.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Usuário logado: <strong>{currentUser?.email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Entre em contato conosco para realizar seu cadastro.
            </p>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full mb-4"
            >
              Fazer Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header sem menu lateral */}
      <div className="bg-white border-b border-blue-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Espaço Saúde</h1>
              <p className="text-sm text-gray-500">💙 Estética • Fisioterapia • Pilates</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-medium text-gray-900">{patientData.full_name}</p>
              <p className="text-sm text-gray-500">Paciente</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {patientData.full_name?.[0] || 'P'}
              </span>
            </div>
            <Button variant="outline" onClick={handleLogout} className="ml-2">
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Olá, {patientData.full_name.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-600">
              Bem-vindo ao seu painel pessoal - Clínica Espaço Saúde
            </p>
          </div>

          {/* Quick Stats with Financial Summary */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Próximas Consultas</p>
                    <p className="text-3xl font-bold">{upcomingAppointments.length}</p>
                  </div>
                  <Calendar className="w-12 h-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Prontuários</p>
                    <p className="text-3xl font-bold">{medicalRecords.length}</p>
                  </div>
                  <FileText className="w-12 h-12 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Consultas Realizadas</p>
                    <p className="text-3xl font-bold">{pastAppointments.length}</p>
                  </div>
                  <UserIcon className="w-12 h-12 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            {/* New Card for Valor Pendente */}
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Valor Pendente</p>
                    <p className="text-2xl font-bold">R$ {financialSummary.pending.toFixed(2).replace('.', ',')}</p> {/* Format currency */}
                  </div>
                  <DollarSign className="w-12 h-12 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold text-green-600">R$ {financialSummary.paid.toFixed(2).replace('.', ',')}</p>
                  <p className="text-gray-600">Total Pago</p>
                </div>
                <div className="text-center p-6 bg-orange-50 rounded-lg">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-3xl font-bold text-orange-600">R$ {financialSummary.pending.toFixed(2).replace('.', ',')}</p>
                  <p className="text-gray-600">Valor Pendente</p>
                </div>
                <div className="flex items-center justify-center">
                  {financialSummary.pending > 0 && (
                    <Button
                      onClick={handleRequestPayment}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Solicitar Dados para Pagamento
                    </Button>
                  )}
                </div>
              </div>

              {/* Mostrar consultas com pagamento pendente */}
              {upcomingAppointments.filter(apt => apt.payment_status === 'pending').length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">Consultas com Pagamento Pendente</h4>
                  <div className="space-y-3">
                    {upcomingAppointments
                      .filter(apt => apt.payment_status === 'pending')
                      .map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div>
                            <p className="font-medium text-gray-900">
                              {appointment.service_type || 'Consulta'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} às {appointment.appointment_time}
                            </p>
                            <p className="text-sm font-medium text-orange-600">
                              R$ {(appointment.value || 0).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">
                            Pagamento Pendente
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Próximas Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Você não possui consultas agendadas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {getProfessionalName(appointment.professional_id)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {getProfessionalSpecialty(appointment.professional_id)}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} às {appointment.appointment_time}
                          </div>
                        </div>
                      </div>
                      <Badge className={statusColors[appointment.status]}>
                        {statusLabels[appointment.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Meus Prontuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medicalRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum prontuário disponível</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicalRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Sessão com {getProfessionalName(record.professional_id)}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          {format(new Date(record.session_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        <p className="text-sm text-gray-700">
                          <strong>Diagnóstico:</strong> {record.diagnosis}
                        </p>
                      </div>
                      {record.attachments && record.attachments.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {record.attachments.map((attachment, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(attachment.file_url, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {attachment.file_name}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Telefone</p>
                    <p className="text-gray-600">{patientData.phone || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">E-mail</p>
                    <p className="text-gray-600">{patientData.email || currentUser.email}</p>
                  </div>
                </div>
              </div>
              {patientData.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Endereço</p>
                    <p className="text-gray-600">{patientData.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
