import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils";
import AppointmentCard from "../schedule/AppointmentCard";
import EvolutionModal from "../schedule/EvolutionModal";

const STATUS = {
  pending:              { color: "#3b82f6", label: "Aguardando" },
  confirmed:            { color: "#3b82f6", label: "Aguardando" },
  completed:            { color: "#22c55e", label: "Finalizado" },
  no_show:              { color: "#ef4444", label: "Não compareceu" },
  justified_absence:    { color: "#a855f7", label: "Aus. justificada" },
  professional_absence: { color: "#f97316", label: "Aus. profissional" },
  null_absence:         { color: "#9ca3af", label: "Aus. nula" },
  cancelled:            { color: "#f87171", label: "Cancelado" },
};

// Atendimentos de hoje no painel: lista enxuta (hora, paciente, serviço e
// status). Tocar abre o mesmo cartão da consulta da Agenda, com todas as
// ações (finalizar, pagamento, evolução, lembrete, editar).
export default function TodaySchedule({ appointments, patients = [], professionals = [], rooms = [], isLoading, onRefresh }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [evolutionAppointment, setEvolutionAppointment] = useState(null);

  const list = [...(appointments || [])].sort((a, b) => (a.appointment_time || "").localeCompare(b.appointment_time || ""));
  const getPatient = (id) => patients.find(p => p.id === id);
  const getProfessional = (id) => professionals.find(p => p.id === id);
  const getRoom = (id) => rooms.find(r => r.id === id);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3" style={{ color: "#e5397f" }}>
        <Clock className="w-7 h-7" />
        <span className="text-4xl font-light leading-none">{isLoading ? "–" : list.filter(a => a.status !== "cancelled").length}</span>
        <span className="text-[15px] leading-tight">atendimentos<br />de hoje</span>
      </div>

      {isLoading ? (
        <div className="px-4 pb-4 space-y-2">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="text-center py-6 text-gray-500 border-t border-gray-100 dark:border-gray-800">Nenhum agendamento para hoje</p>
      ) : (
        <div>
          {list.map(apt => {
            const st = STATUS[apt.status] || STATUS.pending;
            const patient = getPatient(apt.patient_id) || apt.patient;
            return (
              <button
                key={apt.id}
                onClick={() => setSelected(apt)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${apt.status === "cancelled" ? "opacity-50" : ""}`}
              >
                <span className="w-12 text-[15px] font-medium text-gray-900 dark:text-white tabular-nums">{apt.appointment_time}</span>
                <span className="w-1 self-stretch rounded-full" style={{ background: st.color }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-medium text-gray-900 dark:text-white truncate">{patient?.full_name || "Paciente"}</span>
                  <span className="block text-sm text-gray-500 truncate">{apt.service_type || "Consulta"} · <span style={{ color: st.color }}>{st.label}</span></span>
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <AppointmentCard
          appointment={selected}
          patient={getPatient(selected.patient_id)}
          professional={getProfessional(selected.professional_id)}
          room={getRoom(selected.room_id)}
          onClose={() => setSelected(null)}
          onEdit={() => { const id = selected.id; setSelected(null); navigate(`${createPageUrl("Schedule")}?editar=${id}`); }}
          onOpenEvolution={(apt) => { setSelected(null); setEvolutionAppointment(apt); }}
          onStatusChange={(updated) => { setSelected(updated); onRefresh?.(); }}
          onDelete={() => { setSelected(null); onRefresh?.(); }}
        />
      )}

      {evolutionAppointment && (
        <EvolutionModal
          appointment={evolutionAppointment}
          patient={getPatient(evolutionAppointment.patient_id)}
          professional={getProfessional(evolutionAppointment.professional_id)}
          onClose={() => setEvolutionAppointment(null)}
          onSaved={() => { setEvolutionAppointment(null); onRefresh?.(); }}
        />
      )}
    </div>
  );
}
