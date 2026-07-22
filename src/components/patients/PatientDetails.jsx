import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  MessageCircle, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText,
  Edit,
  Phone,
  DollarSign,
  Clock,
  Package,
  Repeat,
  Sparkles,
  CalendarCheck,
  Trash2,
  Pencil
} from "lucide-react";
import { differenceInYears } from "date-fns";

// Converte YYYY-MM-DD → DD/MM/YYYY sem bug de fuso horário
function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
import { Appointment, FinancialRecord, ServicePackage, ServicePlan } from "@/entities/all";
import RecurringServiceForm from "../packages/RecurringServiceForm";
import FixedPackageForm from "../packages/FixedPackageForm";
import PersonalizedPackageForm from "../packages/PersonalizedPackageForm";
import SingleServiceForm from "../packages/SingleServiceForm";
import PatientMedicalHistory from "../medical/PatientMedicalHistory";

const paymentStatusColors = {
  pending: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800"
};

export default function PatientDetails({ patient, onEdit }) {
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({ paid: 0, pending: 0 });
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [selectedPackageType, setSelectedPackageType] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [servicePlans, setServicePlans] = useState([]);
  const [expandedServiceType, setExpandedServiceType] = useState(null);
  const [selectedEditPackage, setSelectedEditPackage] = useState(null);

  const loadPatientData = async () => {
    if (!patient) return;
    
    try {
      // Load appointments
      const appointments = await Appointment.filter({ patient_id: patient.id });
      setPatientAppointments(appointments);

      // Load financial records
      const financialRecords = await FinancialRecord.filter({ patient_id: patient.id });
      
      const summary = financialRecords.reduce((acc, record) => {
        if (record.payment_status === 'paid') {
          acc.paid += record.amount;
        } else if (record.payment_status === 'pending') {
          acc.pending += record.amount;
        }
        return acc;
      }, { paid: 0, pending: 0 });

      setFinancialSummary(summary);
      setPendingTransactions(financialRecords.filter(r => r.payment_status === 'pending'));

      // Load packages
      const patientPackages = await ServicePackage.filter({ patient_id: patient.id });
      console.log("Pacotes carregados:", patientPackages);
      setPackages(patientPackages);

      // Load professionals
      const { Professional } = await import("@/entities/all");
      const profsData = await Professional.list();
      setProfessionals(profsData);

      // Load service plans
      const plansData = await ServicePlan.list();
      setServicePlans(plansData);
    } catch (error) {
      console.error("Erro ao carregar dados do paciente:", error);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [patient]);

  const handleConfirmPayment = async (transactionId) => {
    try {
      const { confirmPayment } = await import("@/functions/confirmPayment");
      const response = await confirmPayment({
        transactionId,
        paymentMethod: 'cash', // Default
        notes: 'Pagamento confirmado pelo admin'
      });

      if (response.data.success) {
        alert('Pagamento confirmado com sucesso!');
        // Recarregar dados
        window.location.reload();
      } else {
        alert('Erro ao confirmar pagamento: ' + response.data.message);
      }
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      alert('Erro ao confirmar pagamento');
    }
  };

  const handleRequestPayment = () => {
    if (!patient?.phone) {
      alert("Este paciente não possui um número de telefone cadastrado.");
      return;
    }

    const message = `🏥 *Espaço Saúde* 🏥

Olá ${patient.full_name}!

Gostaríamos de informar que você tem um valor pendente de *R$ ${financialSummary.pending.toFixed(2).replace('.', ',')}*.

Poderia entrar em contato para combinarmos as opções de pagamento?

Agradecemos a sua atenção!
💙 Estética • Fisioterapia • Pilates`;

    const phoneNumber = patient.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!patient) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-8 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecione um Paciente
          </h3>
          <p className="text-gray-500">
            Clique em um paciente da lista para ver os detalhes
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleWhatsApp = () => {
    const phoneNumber = patient.phone?.replace(/\D/g, '');
    const message = `Olá ${patient.full_name}! Como vai? Aqui é da Espaço Saúde.`;
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCreatePackage = (type) => {
    setSelectedPackageType(type);
    setShowPackageForm(true);
    setExpandedServiceType(null);
  };

  const handleDeletePackage = async (pkg) => {
    if (!confirm(`Excluir o pacote "${pkg.plan_name}"?`)) return;
    try {
      await ServicePackage.delete(pkg.id);
      await loadPatientData();
    } catch (error) {
      alert("Erro ao excluir: " + (error.response?.data?.error || error.message));
    }
  };

  const handleEditPackage = (pkg) => {
    setSelectedPackageType(pkg.package_type);
    setShowPackageForm(true);
    setExpandedServiceType(null);
    // Store pkg for edit — for now opens new form pre-filled via selectedEditPackage
    setSelectedEditPackage(pkg);
  };

  const handleSubmitPackage = async (packageData) => {
    try {
      let newPackage;
      if (selectedEditPackage) {
        newPackage = await ServicePackage.update(selectedEditPackage.id, packageData);
      } else {
        newPackage = await ServicePackage.create(packageData);
      }
      
      // Criar fatura automática apenas na criação
      if (!selectedEditPackage && !packageData.is_free && packageData.final_value > 0) {
        await FinancialRecord.create({
          type: "income",
          patient_id: patient.id,
          professional_id: packageData.professional_id,
          description: `Plano: ${packageData.plan_name} - ${patient.full_name}`,
          amount: packageData.final_value,
          payment_method: "pending",
          payment_status: "pending",
          transaction_date: packageData.start_date,
          notes: `Fatura automática gerada pelo pacote de serviço`
        });
      }
      
      alert(selectedEditPackage ? "Pacote atualizado com sucesso!" : "Pacote criado com sucesso!");
      
      setShowPackageForm(false);
      setSelectedPackageType(null);
      setSelectedEditPackage(null);
      
      // Recarregar todos os dados do paciente
      await loadPatientData();
    } catch (error) {
      console.error("Erro ao criar pacote:", error);
      alert("Erro ao criar pacote: " + (error.response?.data?.error || error.message));
    }
  };

  const serviceTypes = [
    {
      id: "recurring",
      title: "Serviços recorrentes",
      description: "Recomendados para clientes que pagam mensalmente.",
      icon: Repeat,
      iconBg: "bg-purple-500"
    },
    {
      id: "fixed",
      title: "Pacotes fixos",
      description: "Recomendados para planos longos cobrados integralmente à vista ou parcelados.",
      icon: Package,
      iconBg: "bg-green-500"
    },
    {
      id: "personalized",
      title: "Pacotes personalizados",
      description: "Recomendados para pacotes de sessões de fisioterapia e estética.",
      icon: Sparkles,
      iconBg: "bg-orange-500"
    },
    {
      id: "single",
      title: "Atendimento avulsos",
      description: "Recomendados para atendimentos unitários ou experimentais.",
      icon: CalendarCheck,
      iconBg: "bg-cyan-500"
    }
  ];

  const recentAppointments = patientAppointments
    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
    .slice(0, 5);

  // Contagem de sessões finalizadas no mês atual
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const completedThisMonth = patientAppointments.filter(apt => {
    if (apt.status !== 'completed') return false;
    const d = new Date(apt.appointment_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const activePackages = packages.filter(p => p.status === 'active');

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <CardTitle className="text-xl font-bold">
          {patient.full_name}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleWhatsApp}>
            <MessageCircle className="w-4 h-4 text-green-600" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(patient)}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <TabsTrigger value="services" className="flex-1 text-xs">
              SERVIÇOS
            </TabsTrigger>
            <TabsTrigger value="prontuario" className="flex-1 text-xs">
              PRONTUÁRIO
            </TabsTrigger>
            <TabsTrigger value="info" className="flex-1 text-xs">
              CADASTRO
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="p-6 space-y-4">
            {/* Service Type Cards */}
            {serviceTypes.map((service) => {
              const servicePackages = packages.filter(p => 
                p.package_type === service.id && p.status === 'active'
              );
              const isExpanded = expandedServiceType === service.id;
              
              return (
                <div key={service.id} className="space-y-2">
                  <Card 
                    className={`hover:shadow-md transition-all border-2 cursor-pointer ${isExpanded ? 'border-purple-300 shadow-md' : ''}`}
                    onClick={() => setExpandedServiceType(isExpanded ? null : service.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${service.iconBg} flex items-center justify-center`}>
                            <service.icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{service.title}</h3>
                            <p className="text-xs text-gray-600">{service.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Ativos: <span className="font-semibold">
                                {servicePackages.length || 'nenhum'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreatePackage(service.id);
                          }}
                        >
                          + Novo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de pacotes expandida ao clicar no card */}
                  {isExpanded && (
                    <div className="ml-4 space-y-2 border-l-2 border-purple-200 pl-3">
                      {servicePackages.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-2">Nenhum plano ativo para este tipo.</p>
                      ) : (
                        servicePackages.map((pkg) => (
                          <Card key={pkg.id} className="bg-gray-50">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{pkg.plan_name}</p>
                                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-1">
                                   <span>Início: {formatDateBR(pkg.start_date)}</span>
                                    {pkg.sessions_per_cycle && (
                                      <span>{pkg.sessions_used || 0}/{pkg.sessions_per_cycle} sessões</span>
                                    )}
                                   <span className="font-semibold text-green-600">
                                      {pkg.is_free ? "Gratuito" : `R$ ${pkg.final_value?.toFixed(2)}`}
                                    </span>
                                  </div>
                                  {(pkg.package_type === 'recurring' || pkg.cycle_type === 'monthly') && (
                                    <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                      <CalendarCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      <span className="text-xs text-blue-700 font-medium">
                                        {completedThisMonth}
                                        {pkg.sessions_per_cycle ? `/${pkg.sessions_per_cycle}` : ''} aulas realizadas este mês
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">Ativo</Badge>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700" onClick={() => handleEditPackage(pkg)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDeletePackage(pkg)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="prontuario" className="p-4">
            <PatientMedicalHistory patient={patient} />
          </TabsContent>

          <TabsContent value="info" className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">
              {patient.full_name[0]}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{patient.full_name}</h3>
            <Badge variant={patient.active ? "default" : "secondary"} className="mt-1">
              {patient.active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Resumo Financeiro
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">R$ {financialSummary.paid.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Total Pago</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">R$ {financialSummary.pending.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Pendente</p>
            </div>
          </div>

          {/* Payment Actions */}
          {financialSummary.pending > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestPayment}
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Solicitar Pagamento
              </Button>
            </div>
          )}

          {/* Pending Transactions */}
          {pendingTransactions.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-2">Pagamentos Pendentes</h5>
              <div className="space-y-2">
                {pendingTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-2 bg-orange-50 rounded border gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">R$ {transaction.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 truncate">{transaction.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleConfirmPayment(transaction.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Confirmar Pagamento
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          if (!confirm("Excluir este pagamento pendente?")) return;
                          await FinancialRecord.delete(transaction.id);
                          await loadPatientData();
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {patient.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{patient.phone}</p>
                <p className="text-sm text-gray-500">Telefone/WhatsApp</p>
              </div>
            </div>
          )}

          {patient.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{patient.email}</p>
                <p className="text-sm text-gray-500">E-mail</p>
              </div>
            </div>
          )}

          {patient.birth_date && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {formatDateBR(patient.birth_date)}
                  {' '}({differenceInYears(new Date(), new Date(patient.birth_date + 'T12:00:00'))} anos)
                </p>
                <p className="text-sm text-gray-500">Data de Nascimento</p>
              </div>
            </div>
          )}

          {patient.cpf && (
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{patient.cpf}</p>
                <p className="text-sm text-gray-500">CPF</p>
              </div>
            </div>
          )}

          {patient.address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{patient.address}</p>
                <p className="text-sm text-gray-500">Endereço</p>
              </div>
            </div>
          )}

          {patient.emergency_contact && (
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{patient.emergency_contact}</p>
                <p className="text-sm text-gray-500">Contato de Emergência</p>
              </div>
            </div>
          )}

          {patient.medical_notes && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Observações Médicas</h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">{patient.medical_notes}</p>
              </div>
            </div>
          )}

          {/* Consultas Recentes */}
          {recentAppointments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Consultas Recentes</h4>
              <div className="space-y-2">
                {recentAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{appointment.service_type || 'Consulta'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDateBR(appointment.appointment_date)}
                        <Clock className="w-3 h-3" />
                        {appointment.appointment_time}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {appointment.value > 0 && (
                        <span className="text-sm font-medium text-green-600">
                          R$ {appointment.value.toFixed(2)}
                        </span>
                      )}
                      {appointment.status === 'cancelled' && (
                        <Badge className="bg-red-100 text-red-700" size="sm">Cancelado</Badge>
                      )}
                      {appointment.status === 'completed' && appointment.value > 0 && (
                        <Badge className={paymentStatusColors[appointment.payment_status || 'pending']} size="sm">
                          {appointment.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Badge className="bg-blue-100 text-blue-700" size="sm">Confirmado</Badge>
                      )}
                      {appointment.status === 'no_show' && (
                        <Badge className="bg-orange-100 text-orange-700" size="sm">Faltou</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Package Form Modals */}
      {showPackageForm && selectedPackageType === 'recurring' && (
        <RecurringServiceForm
          patient={patient}
          professionals={professionals}
          servicePlans={servicePlans}
          onSubmit={handleSubmitPackage}
          onCancel={() => {
            setShowPackageForm(false);
            setSelectedPackageType(null);
            setSelectedEditPackage(null);
          }}
        />
      )}

      {showPackageForm && selectedPackageType === 'fixed' && (
        <FixedPackageForm
          patient={patient}
          professionals={professionals}
          servicePlans={servicePlans}
          onSubmit={handleSubmitPackage}
          onCancel={() => {
            setShowPackageForm(false);
            setSelectedPackageType(null);
            setSelectedEditPackage(null);
          }}
        />
      )}

      {showPackageForm && selectedPackageType === 'personalized' && (
        <PersonalizedPackageForm
          patient={patient}
          professionals={professionals}
          servicePlans={servicePlans}
          onSubmit={handleSubmitPackage}
          onCancel={() => {
            setShowPackageForm(false);
            setSelectedPackageType(null);
            setSelectedEditPackage(null);
          }}
        />
      )}

      {showPackageForm && selectedPackageType === 'single' && (
        <SingleServiceForm
          patient={patient}
          professionals={professionals}
          servicePlans={servicePlans}
          onSubmit={handleSubmitPackage}
          onCancel={() => {
            setShowPackageForm(false);
            setSelectedPackageType(null);
            setSelectedEditPackage(null);
          }}
        />
      )}
    </Card>
  );
}