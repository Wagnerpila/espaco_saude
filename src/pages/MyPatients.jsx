
import React, { useState, useEffect } from "react";
import { Patient, Appointment, Professional } from "@/entities/all";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Search, Phone, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MyPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfessional, setCurrentProfessional] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filterPatients = () => {
      if (!searchTerm) {
        setFilteredPatients(patients);
        return;
      }

      const filtered = patients.filter(patient =>
        patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm)
      );
      setFilteredPatients(filtered);
    };

    filterPatients();
  }, [patients, searchTerm]);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      // Find current professional
      const professionals = await Professional.list();
      const professional = professionals.find(p => p.email === user.email);
      setCurrentProfessional(professional);

      if (professional) {
        // Get appointments for this professional
        const allAppointments = await Appointment.list();
        const professionalAppointments = allAppointments.filter(
          apt => apt.professional_id === professional.id
        );
        setAppointments(professionalAppointments);

        // Get unique patients from appointments
        const allPatients = await Patient.list();
        const patientIds = [...new Set(professionalAppointments.map(apt => apt.patient_id))];
        const myPatients = allPatients.filter(patient => patientIds.includes(patient.id));
        
        setPatients(myPatients);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  const getPatientAppointments = (patientId) => {
    return appointments.filter(apt => apt.patient_id === patientId);
  };

  const getUpcomingAppointments = (patientId) => {
    const patientAppointments = getPatientAppointments(patientId);
    return patientAppointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= new Date() && apt.status !== 'cancelled';
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Meus Pacientes
          </h1>
          <p className="text-gray-600">
            Gerencie seus pacientes e acompanhe o histórico de atendimentos
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            {filteredPatients.length} paciente(s) encontrado(s)
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum paciente encontrado
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Tente ajustar os termos de busca' : 'Você ainda não possui pacientes atendidos'}
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => {
              const patientAppointments = getPatientAppointments(patient.id);
              const upcomingAppointments = getUpcomingAppointments(patient.id);
              const lastAppointment = patientAppointments
                .filter(apt => new Date(apt.appointment_date) < new Date())
                .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))[0];

              return (
                <Card key={patient.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {patient.full_name?.[0] || 'P'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{patient.full_name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          {patient.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {patient.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{patientAppointments.length}</p>
                        <p className="text-xs text-gray-500">Total Consultas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{upcomingAppointments.length}</p>
                        <p className="text-xs text-gray-500">Próximas</p>
                      </div>
                    </div>

                    {lastAppointment && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-gray-600 mb-1">Última consulta:</p>
                        <p className="text-sm font-medium">
                          {format(new Date(lastAppointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-500">{lastAppointment.service_type}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {patient.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(`https://wa.me/55${patient.phone.replace(/\D/g, '')}`, '_blank')}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Patient Detail Modal would go here */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhes do Paciente</CardTitle>
                <Button variant="ghost" onClick={() => setSelectedPatient(null)}>
                  ×
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xl">
                      {selectedPatient.full_name?.[0] || 'P'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedPatient.full_name}</h3>
                    <p className="text-gray-600">{selectedPatient.email}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Telefone</p>
                    <p className="text-gray-600">{selectedPatient.phone || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Data de Nascimento</p>
                    <p className="text-gray-600">
                      {selectedPatient.birth_date ? 
                        format(new Date(selectedPatient.birth_date), 'dd/MM/yyyy', { locale: ptBR }) : 
                        'Não informado'}
                    </p>
                  </div>
                </div>

                {selectedPatient.address && (
                  <div>
                    <p className="font-medium text-gray-900">Endereço</p>
                    <p className="text-gray-600">{selectedPatient.address}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Histórico de Consultas</h4>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {getPatientAppointments(selectedPatient.id).map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{apt.service_type}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(apt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })} às {apt.appointment_time}
                          </p>
                        </div>
                        <Badge className={
                          apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                          apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {apt.status === 'completed' ? 'Concluído' :
                           apt.status === 'confirmed' ? 'Confirmado' :
                           apt.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
