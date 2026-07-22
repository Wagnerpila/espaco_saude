import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, MessageCircle, Edit } from "lucide-react";
import AppointmentCard from "./AppointmentCard";
import EvolutionModal from "./EvolutionModal";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  no_show: "bg-gray-100 text-gray-800",
  justified_absence: "bg-purple-100 text-purple-800",
  professional_absence: "bg-orange-100 text-orange-800",
  null_absence: "bg-gray-100 text-gray-600",
};

const statusLabels = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Finalizado",
  no_show: "Falta",
  justified_absence: "Falta Just.",
  professional_absence: "Aus. Prof.",
  null_absence: "Aus. Nula",
};

export default function WeekView({ 
  weekStart, 
  appointments, 
  professionals,
  patients,
  rooms = [],
  isLoading,
  onTimeSlotClick,
  onEditAppointment,
  onSendReminder
}) {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [evolutionAppointment, setEvolutionAppointment] = useState(null);
  const [localAppointments, setLocalAppointments] = useState(appointments);

  React.useEffect(() => { setLocalAppointments(appointments); }, [appointments]);

  const getPatient = (id) => patients.find(p => p.id === id);
  const getProfessional = (id) => professionals.find(p => p.id === id);
  const getRoom = (id) => rooms.find(r => r.id === id);
  const weekDays = eachDayOfInterval({
    start: startOfWeek(weekStart, { weekStartsOn: 1 }),
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  });

  const getAppointmentsForDay = (date) => {
    return localAppointments.filter(
      apt => apt.appointment_date === format(date, 'yyyy-MM-dd')
    ).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || 'Paciente não encontrado';
  };


  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(7).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array(3).fill(0).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          return (
            <Card key={format(day, 'yyyy-MM-dd')} className={`shadow-sm dark:bg-gray-900 dark:border-gray-700 ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(day, 'dd/MM')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 min-h-48">
                  {dayAppointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-dashed"
                        onClick={() => onTimeSlotClick(format(day, 'yyyy-MM-dd'), '09:00', professionals[0]?.id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  ) : (
                    dayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="w-full h-auto p-2 text-left justify-start rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium dark:text-gray-300">
                              {appointment.appointment_time}
                            </span>
                            <Badge className={`${statusColors[appointment.status] || 'bg-gray-100 text-gray-800'} px-1 py-0 text-[10px] leading-4`}>
                              {statusLabels[appointment.status] || appointment.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-medium text-gray-900 dark:text-white truncate">
                            {getPatientName(appointment.patient_id)}
                          </p>
                          {appointment.service_type && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {appointment.service_type}
                            </p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); onSendReminder(appointment); }}
                              title="Enviar Lembrete WhatsApp"
                              className="h-7 w-7"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); onEditAppointment(appointment); }}
                              title="Editar Agendamento"
                              className="h-7 w-7"
                            >
                              <Edit className="w-3.5 h-3.5 text-gray-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedAppointment && (
        <AppointmentCard
          appointment={selectedAppointment}
          patient={getPatient(selectedAppointment.patient_id)}
          professional={getProfessional(selectedAppointment.professional_id)}
          room={getRoom(selectedAppointment.room_id)}
          onClose={() => setSelectedAppointment(null)}
          onEdit={() => { setSelectedAppointment(null); onEditAppointment(selectedAppointment); }}
          onOpenEvolution={(apt) => { setSelectedAppointment(null); setEvolutionAppointment(apt); }}
          onStatusChange={(updated) => {
            setSelectedAppointment(updated);
            setLocalAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
          }}
          onDelete={(deleted) => {
            setSelectedAppointment(null);
            setLocalAppointments(prev => prev.filter(a => a.id !== deleted.id));
          }}
        />
      )}

      {evolutionAppointment && (
        <EvolutionModal
          appointment={evolutionAppointment}
          patient={getPatient(evolutionAppointment.patient_id)}
          professional={getProfessional(evolutionAppointment.professional_id)}
          onClose={() => setEvolutionAppointment(null)}
          onSaved={() => setEvolutionAppointment(null)}
        />
      )}
    </div>
  );
}