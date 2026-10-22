import React, { useState, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import MonthCalendar from "./MonthCalendar";
import AppointmentCard from "./AppointmentCard";
import EvolutionModal from "./EvolutionModal";

const STATUS_STYLE = {
  pending:              { stripe: "#3b82f6", label: "Aguardando" },
  confirmed:            { stripe: "#3b82f6", label: "Aguardando" },
  completed:            { stripe: "#22c55e", label: "Finalizado" },
  no_show:              { stripe: "#ef4444", label: "Não compareceu" },
  justified_absence:    { stripe: "#a855f7", label: "Aus. justificada" },
  professional_absence: { stripe: "#f97316", label: "Aus. profissional" },
  null_absence:         { stripe: "#9ca3af", label: "Aus. nula" },
  cancelled:            { stripe: "#f87171", label: "Cancelado" },
};

const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MIN_FREE_MINUTES = 30;

const toMin = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const fmtDuration = (min) => {
  const h = Math.floor(min / 60), m = min % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
};

// Horário de trabalho do profissional no dia (Professional.working_hours).
function workingWindow(professional, date) {
  const wh = professional?.working_hours?.[WEEKDAY_KEYS[date.getDay()]];
  if (!wh || !wh.active || !wh.start || !wh.end) return null;
  return { start: toMin(wh.start), end: toMin(wh.end), label: `${wh.start} - ${wh.end}` };
}

// Intervalos livres de pelo menos 30 min dentro do expediente, descontando os
// atendimentos do profissional (cancelados não ocupam horário). Hoje, só
// conta a partir de agora.
function freeSlots(workWindow, dayAppointments, date) {
  if (!win) return [];
  let cursor = win.start;
  if (isSameDay(date, new Date())) {
    const now = new Date();
    const nowMin = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
    cursor = Math.max(cursor, nowMin);
  }
  const busy = dayAppointments
    .filter(a => a.status !== "cancelled")
    .map(a => ({ start: toMin(a.appointment_time), end: toMin(a.appointment_time) + (Number(a.duration) || 60) }))
    .sort((a, b) => a.start - b.start);
  const out = [];
  for (const b of busy) {
    if (b.start - cursor >= MIN_FREE_MINUTES && cursor < win.end) out.push({ start: cursor, minutes: Math.min(b.start, win.end) - cursor });
    cursor = Math.max(cursor, b.end);
  }
  if (win.end - cursor >= MIN_FREE_MINUTES) out.push({ start: cursor, minutes: win.end - cursor });
  return out;
}

// Modo "Lista" da agenda (estilo Master UP): mês no topo, filtro por
// profissional e a lista do dia. Com um profissional escolhido, os horários
// livres dele aparecem como cartões que já abrem o agendamento preenchido.
export default function AgendaListView({
  date, onSelectDate, appointments, professionals, patients, rooms = [], isLoading,
  onTimeSlotClick, onEditAppointment, onChanged,
}) {
  const [professionalId, setProfessionalId] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [evolutionAppointment, setEvolutionAppointment] = useState(null);

  const getPatient = (id) => patients.find(p => p.id === id);
  const getProfessional = (id) => professionals.find(p => p.id === id);
  const getRoom = (id) => rooms.find(r => r.id === id);

  const visible = useMemo(
    () => appointments.filter(a => !professionalId || a.professional_id === professionalId),
    [appointments, professionalId]
  );
  const marked = useMemo(
    () => new Set(visible.filter(a => a.status !== "cancelled").map(a => a.appointment_date)),
    [visible]
  );

  const dateKey = format(date, "yyyy-MM-dd");
  const dayAppointments = visible
    .filter(a => a.appointment_date === dateKey)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const professional = professionalId ? getProfessional(professionalId) : null;
  const workWindow = professional ? workingWindow(professional, date) : null;
  const free = professional ? freeSlots(workWindow, dayAppointments, date) : [];

  // Atendimentos e horários livres intercalados por horário.
  const items = [
    ...dayAppointments.map(a => ({ kind: "apt", min: toMin(a.appointment_time), apt: a })),
    ...free.map(f => ({ kind: "free", min: f.start, free: f })),
  ].sort((a, b) => a.min - b.min || (a.kind === "apt" ? -1 : 1));

  const dayLabel = `${isSameDay(date, new Date()) ? "Hoje " : ""}${format(date, "EEE, d 'de' MMMM", { locale: ptBR })}`;

  return (
    <>
      <div className="md:grid md:grid-cols-[360px_1fr] md:gap-4 md:items-start">
        <div className="bg-white dark:bg-gray-900 md:rounded-2xl md:shadow-sm md:border md:border-gray-100 dark:md:border-gray-800 md:sticky md:top-4">
          <MonthCalendar selectedDate={date} onSelectDate={onSelectDate} marked={marked} />

          {/* Filtro por profissional */}
          <div className="flex gap-2 overflow-x-auto px-3 py-2 border-t border-gray-100 dark:border-gray-800 no-scrollbar">
            {[{ id: null, full_name: "Todos" }, ...professionals].map(p => {
              const active = professionalId === p.id;
              return (
                <button
                  key={p.id || "all"}
                  onClick={() => setProfessionalId(p.id)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm border transition-colors ${active ? "bg-brand text-white border-transparent" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"}`}
                >
                  {p.id ? p.full_name.split(" ")[0] : p.full_name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-[15px]">
            <span className="text-brand capitalize">{dayLabel}</span>
            <span className="text-gray-500 text-sm">
              {professional ? (workWindow ? workWindow.label : "folga") : `${dayAppointments.filter(a => a.status !== "cancelled").length} atend.`}
            </span>
          </div>
        </div>

        <div className="p-3 md:p-0 space-y-2">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-white dark:bg-gray-900 rounded-xl animate-pulse" />)
          ) : (
            <>
              {items.map((item) => {
                if (item.kind === "free") {
                  return (
                    <button
                      key={`free-${item.min}`}
                      onClick={() => onTimeSlotClick(dateKey, toHHMM(item.free.start), professionalId)}
                      className="w-full flex items-start gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-left hover:border-pink-300"
                    >
                      <span className="w-12 text-[15px] text-brand tabular-nums pt-0.5">{toHHMM(item.free.start)}</span>
                      <span className="flex-1">
                        <span className="block text-[16px] text-brand">Adicionar agendamento</span>
                        <span className="block text-sm text-gray-500">disponível: {fmtDuration(item.free.minutes)}</span>
                      </span>
                    </button>
                  );
                }
                const apt = item.apt;
                const style = STATUS_STYLE[apt.status] || STATUS_STYLE.pending;
                const patient = getPatient(apt.patient_id);
                const prof = getProfessional(apt.professional_id);
                const room = getRoom(apt.room_id);
                const endMin = toMin(apt.appointment_time) + (Number(apt.duration) || 60);
                return (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    className={`w-full flex items-stretch bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden text-left ${apt.status === "cancelled" ? "opacity-60" : ""}`}
                  >
                    <span className="w-1.5 flex-shrink-0" style={{ background: style.stripe }} />
                    <span className="w-16 flex-shrink-0 px-3 py-3 text-sm tabular-nums">
                      <span className="block font-semibold text-gray-900 dark:text-white">{apt.appointment_time}</span>
                      <span className="block text-gray-400">{toHHMM(endMin)}</span>
                    </span>
                    <span className="flex-1 min-w-0 py-3 pr-3">
                      <span className="block font-semibold text-gray-900 dark:text-white truncate">{patient?.full_name || "Paciente"}</span>
                      <span className="block text-sm text-gray-600 dark:text-gray-300 truncate">{apt.service_type || "Consulta"}</span>
                      <span className="block text-xs text-gray-400 truncate">
                        {[prof?.full_name, room?.room_name].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex flex-col items-end justify-center pr-3 gap-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full text-white whitespace-nowrap" style={{ background: style.stripe }}>{style.label}</span>
                      {apt.value > 0 && <span className="text-xs text-gray-500 tabular-nums">R$ {Number(apt.value).toFixed(2).replace(".", ",")}</span>}
                    </span>
                  </button>
                );
              })}

              {items.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  {professional && !workWindow ? "Profissional de folga neste dia." : "Nenhum agendamento neste dia."}
                </div>
              )}

              {!professional && (
                <button
                  onClick={() => onTimeSlotClick(dateKey, "09:00", null)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-3 text-brand"
                >
                  <Plus className="w-4 h-4" /> Adicionar agendamento
                </button>
              )}
            </>
          )}
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
          onStatusChange={(updated) => { setSelectedAppointment(updated); onChanged?.(); }}
          onDelete={() => { setSelectedAppointment(null); onChanged?.(); }}
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
