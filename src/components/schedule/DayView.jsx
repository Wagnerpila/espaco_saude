import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import AppointmentCard from "./AppointmentCard";
import EvolutionModal from "./EvolutionModal";

const STATUS_STYLE = {
  pending:              { bg: "bg-blue-100",   border: "border-l-blue-500",   dot: "bg-blue-500",   label: "Aguardando" },
  confirmed:            { bg: "bg-blue-100",   border: "border-l-blue-500",   dot: "bg-blue-500",   label: "Aguardando" },
  completed:            { bg: "bg-green-100",  border: "border-l-green-500",  dot: "bg-green-500",  label: "Finalizado" },
  no_show:              { bg: "bg-red-100",    border: "border-l-red-500",    dot: "bg-red-500",    label: "Não Compareceu" },
  justified_absence:    { bg: "bg-purple-100", border: "border-l-purple-500", dot: "bg-purple-500", label: "Aus. Justificada" },
  professional_absence: { bg: "bg-orange-100", border: "border-l-orange-500", dot: "bg-orange-500", label: "Aus. Profissional" },
  null_absence:         { bg: "bg-gray-100",   border: "border-l-gray-400",   dot: "bg-gray-400",   label: "Aus. Nula" },
  cancelled:            { bg: "bg-red-50",     border: "border-l-red-400",    dot: "bg-red-400",    label: "Cancelado" }
};

export default function DayView({ date, appointments, professionals, patients, rooms = [], isLoading, onTimeSlotClick, onEditAppointment }) {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [evolutionAppointment, setEvolutionAppointment] = useState(null);

  const dayAppointments = appointments
    .filter(apt => apt.appointment_date === format(date, 'yyyy-MM-dd'))
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const getPatient = (id) => patients.find(p => p.id === id);
  const getProfessional = (id) => professionals.find(p => p.id === id);
  const getRoom = (id) => rooms.find(r => r.id === id);

  if (isLoading) {
    return <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-orange-500">
          <span className="text-white font-bold text-sm">
            {format(date, "EEEE, dd 'de' MMMM", { locale: { localize: { day: n => ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][n], month: n => ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][n] }, formatLong: {} } })}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 h-7 text-xs"
            onClick={() => onTimeSlotClick(format(date, 'yyyy-MM-dd'), '09:00', null)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo
          </Button>
        </div>

        {dayAppointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Nenhum agendamento para este dia</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => onTimeSlotClick(format(date, 'yyyy-MM-dd'), '09:00', null)}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar agendamento
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dayAppointments.map(appointment => {
              const style = STATUS_STYLE[appointment.status] || STATUS_STYLE.pending;
              const patient = getPatient(appointment.patient_id);
              const prof = getProfessional(appointment.professional_id);
              return (
                <div
                  key={appointment.id}
                  className={`flex items-center gap-3 px-4 py-3 border-l-4 cursor-pointer hover:brightness-95 transition-all ${style.bg} ${style.border}`}
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  <div className="text-center w-12 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-gray-500" />
                    <span className="text-xs font-bold text-gray-700">{appointment.appointment_time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{patient?.full_name || 'Paciente'}</p>
                    <p className="text-xs text-gray-600 truncate">{appointment.service_type || 'Consulta'}</p>
                    {prof && <p className="text-xs text-gray-500 truncate">{prof.full_name}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`}></span>
                    <span className="text-xs text-gray-600 hidden sm:block">{style.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          onStatusChange={(updated) => setSelectedAppointment(updated)}
          onDelete={() => setSelectedAppointment(null)}
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
    </>
  );
}