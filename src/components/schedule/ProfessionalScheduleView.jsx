import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, MessageCircle, Plus, Edit, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

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

export default function ProfessionalScheduleView({
  date,
  appointments,
  patients,
  currentUser,
  isLoading,
  onEditAppointment,
  onSendReminder,
  onNewAppointment
}) {
  // Filter appointments for current professional only
  const professionalAppointments = appointments.filter(apt => 
    apt.appointment_date === format(date, 'yyyy-MM-dd') &&
    apt.professional_id === currentUser?.professional?.id
  ).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || 'Paciente não encontrado';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Minha Agenda - {format(date, 'dd/MM/yyyy')}</h2>
        <Button onClick={onNewAppointment} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {professionalAppointments.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum agendamento para hoje
          </h3>
          <p className="text-gray-500 mb-4">
            Sua agenda está livre para este dia.
          </p>
          <Button onClick={onNewAppointment} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Agendamento
          </Button>
        </Card>
      ) : (
        professionalAppointments.map((appointment) => (
          <Card key={appointment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {getPatientName(appointment.patient_id)}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {appointment.appointment_time}
                      </span>
                      {appointment.service_type && (
                        <span>• {appointment.service_type}</span>
                      )}
                      {appointment.duration && (
                        <span>• {appointment.duration} min</span>
                      )}
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        {appointment.notes}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[appointment.status]}>
                    {statusLabels[appointment.status]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSendReminder(appointment)}
                    title="Enviar Lembrete WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditAppointment(appointment)}
                    title="Editar Agendamento"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}