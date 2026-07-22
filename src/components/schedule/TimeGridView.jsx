import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import AppointmentCard from "./AppointmentCard";
import EvolutionModal from "./EvolutionModal";

const STATUS_STYLE = {
  pending:              { bg: "bg-blue-500",   border: "border-l-blue-700",   text: "Aguardando" },
  confirmed:            { bg: "bg-blue-500",   border: "border-l-blue-700",   text: "Aguardando" },
  completed:            { bg: "bg-green-500",  border: "border-l-green-700",  text: "Finalizado" },
  no_show:              { bg: "bg-red-500",    border: "border-l-red-700",    text: "Não Compareceu" },
  justified_absence:    { bg: "bg-purple-500", border: "border-l-purple-700", text: "Aus. Justificada" },
  professional_absence: { bg: "bg-orange-500", border: "border-l-orange-700", text: "Aus. Profissional" },
  null_absence:         { bg: "bg-gray-400",   border: "border-l-gray-600",   text: "Aus. Nula" },
  cancelled:            { bg: "bg-red-400",    border: "border-l-red-600",    text: "Cancelado" }
};

export default function TimeGridView({ date, appointments, professionals, patients, rooms = [], isLoading, onTimeSlotClick, onEditAppointment }) {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [evolutionAppointment, setEvolutionAppointment] = useState(null);
  const [localAppointments, setLocalAppointments] = useState(appointments);

  React.useEffect(() => {
    setLocalAppointments(appointments);
  }, [appointments]);

  const baseSlots = [];
  for (let hour = 7; hour <= 20; hour++) {
    baseSlots.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 20) baseSlots.push(`${String(hour).padStart(2, '0')}:30`);
  }

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayAppointments = localAppointments.filter(apt => apt.appointment_date === dateStr);

  // Agendamentos em horários que não caem nos slots fixos de 30min (ex: 12:15)
  // também precisam de uma linha própria na grade, senão somem da agenda.
  const timeSlots = [...new Set([...baseSlots, ...dayAppointments.map(apt => apt.appointment_time)])].sort();

  const getPatient = (id) => patients.find(p => p.id === id);
  const getProfessional = (id) => professionals.find(p => p.id === id);
  const getRoom = (id) => rooms.find(r => r.id === id);

  if (isLoading) return <div className="text-center py-8 text-gray-500">Carregando agenda...</div>;

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header simples - sem colunas de profissional */}
        <div className="bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-3 flex items-center gap-3">
          <span className="text-white font-bold text-sm w-16 text-center flex-shrink-0">Hora</span>
          <span className="text-white font-bold text-sm">Agendamentos do dia</span>
        </div>

        {/* Time rows */}
        <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
          {timeSlots.map(slot => {
            const slotApts = dayAppointments.filter(apt => apt.appointment_time === slot);
            return (
              <div key={slot} className="flex min-h-[52px]">
                {/* Hour label */}
                <div className="w-16 flex-shrink-0 flex items-start justify-center pt-2 border-r border-gray-200 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-600">{slot}</span>
                </div>

                {/* Appointments area */}
                <div
                  className={`flex-1 px-2 py-1 flex flex-wrap gap-2 items-start group ${slotApts.length === 0 ? 'hover:bg-purple-50 cursor-pointer' : ''} transition-colors`}
                  onClick={() => slotApts.length === 0 && onTimeSlotClick(dateStr, slot, null)}
                >
                  {slotApts.length === 0 ? (
                    <Plus className="w-4 h-4 text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  ) : (
                    slotApts.map(apt => {
                      const style = STATUS_STYLE[apt.status] || STATUS_STYLE.pending;
                      const patient = getPatient(apt.patient_id);
                      const prof = getProfessional(apt.professional_id);
                      return (
                        <div
                          key={apt.id}
                          className={`px-3 py-2 rounded-lg border-l-4 ${style.bg} ${style.border} text-white cursor-pointer hover:opacity-90 transition-opacity min-w-[180px] max-w-sm flex-1`}
                          onClick={(e) => { e.stopPropagation(); setSelectedAppointment(apt); }}
                        >
                          <p className="font-semibold text-[11px] leading-tight truncate">{patient?.full_name || 'Paciente'}</p>
                          {apt.service_type && <p className="text-[10px] opacity-90 truncate">{apt.service_type}</p>}
                          {prof && <p className="text-[10px] opacity-80 truncate">{prof.full_name} • {prof.specialty}</p>}
                          <span className="text-[10px] opacity-75">{style.text}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
    </>
  );
}