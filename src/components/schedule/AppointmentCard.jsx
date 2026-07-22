import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, Plus, FileText, BarChart2, MoreVertical,
  User, CheckSquare, HelpCircle, Monitor, Users, DollarSign,
  RefreshCw, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Appointment as AppointmentEntity } from "@/entities/all";
import PaymentModal from "./PaymentModal";

const STATUS_CONFIG = {
  pending: {
    label: "Aguardando Chegar",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    borderColor: "border-blue-500",
    badgeBg: "bg-blue-100",
    dot: "bg-blue-500"
  },
  confirmed: {
    label: "Aguardando Chegar",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    borderColor: "border-blue-500",
    badgeBg: "bg-blue-100",
    dot: "bg-blue-500"
  },
  completed: {
    label: "Finalizado",
    color: "bg-green-500",
    textColor: "text-green-700",
    borderColor: "border-green-500",
    badgeBg: "bg-green-100",
    dot: "bg-green-500"
  },
  no_show: {
    label: "Não Compareceu",
    color: "bg-red-500",
    textColor: "text-red-700",
    borderColor: "border-red-500",
    badgeBg: "bg-red-100",
    dot: "bg-red-500"
  },
  justified_absence: {
    label: "Ausência Justificada",
    color: "bg-purple-500",
    textColor: "text-purple-700",
    borderColor: "border-purple-500",
    badgeBg: "bg-purple-100",
    dot: "bg-purple-500"
  },
  professional_absence: {
    label: "Ausência do Profissional",
    color: "bg-orange-500",
    textColor: "text-orange-700",
    borderColor: "border-orange-500",
    badgeBg: "bg-orange-100",
    dot: "bg-orange-500"
  },
  null_absence: {
    label: "Ausência Nula",
    color: "bg-gray-400",
    textColor: "text-gray-700",
    borderColor: "border-gray-400",
    badgeBg: "bg-gray-100",
    dot: "bg-gray-400"
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-400",
    textColor: "text-red-700",
    borderColor: "border-red-400",
    badgeBg: "bg-red-100",
    dot: "bg-red-400"
  }
};

// Mini status circles like in the prints (A, F, N, AJ, AP, AN)
const STATUS_CIRCLES = [
  { key: "pending",              short: "A",  label: "Aguardando",          color: "bg-blue-500" },
  { key: "completed",            short: "F",  label: "Finalizado",           color: "bg-green-500" },
  { key: "no_show",              short: "N",  label: "Não Compareceu",       color: "bg-red-500" },
  { key: "justified_absence",    short: "AJ", label: "Ausência Justificada", color: "bg-purple-500" },
  { key: "professional_absence", short: "AP", label: "Ausência Profissional",color: "bg-orange-500" },
  { key: "null_absence",         short: "AN", label: "Ausência Nula",        color: "bg-gray-400" }
];

export default function AppointmentCard({ appointment, patient, professional, room, onClose, onStatusChange, onEdit, onOpenEvolution, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentStatus = pendingStatus || appointment.status;
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;

  const handleSelectStatus = (newStatus) => {
    setShowStatusMenu(false);
    if (newStatus !== appointment.status) {
      setPendingStatus(newStatus);
    } else {
      setPendingStatus(null);
    }
  };

  // Confirmação manual pelo admin: além de marcar o agendamento como
  // confirmado, dispara o envio automático da confirmação por WhatsApp para
  // o paciente (ver hook em server/src/routes/entities.routes.js).
  const handleConfirmAppointment = async () => {
    setConfirming(true);
    try {
      await AppointmentEntity.update(appointment.id, { status: 'confirmed' });
      if (onStatusChange) onStatusChange({ ...appointment, status: 'confirmed' });
    } catch (e) {
      console.error(e);
    }
    setConfirming(false);
  };

  const handleDeleteAppointment = async () => {
    if (!confirm("Excluir este agendamento? Essa ação não pode ser desfeita.")) return;
    setDeleting(true);
    try {
      await AppointmentEntity.delete(appointment.id);
      if (onDelete) onDelete(appointment);
      else onClose();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Erro ao excluir agendamento. Verifique se já existe comissão gerada para ele.");
    }
    setDeleting(false);
  };

  const handleSaveStatus = async () => {
    if (!pendingStatus) return;
    setLoading(true);
    try {
      await AppointmentEntity.update(appointment.id, { status: pendingStatus });
      if (onStatusChange) onStatusChange({ ...appointment, status: pendingStatus });
      setPendingStatus(null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const dateStr = appointment.appointment_date
    ? format(new Date(appointment.appointment_date + 'T00:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : '';
  const endTime = (() => {
    if (!appointment.appointment_time) return '';
    const [h, m] = appointment.appointment_time.split(':').map(Number);
    const total = h * 60 + m + (appointment.duration || 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  })();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top action bar */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs h-8" onClick={() => onOpenEvolution && onOpenEvolution(appointment)}>
            <Plus className="w-3 h-3" /> Evolução
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <FileText className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <BarChart2 className="w-4 h-4" />
          </Button>
          <div className="relative ml-auto">
            <Button variant="outline" size="sm" className="h-8 text-xs flex gap-1" onClick={() => setShowStatusMenu(v => !v)}>
              <MoreVertical className="w-3 h-3" /> Ações
            </Button>
            {showStatusMenu && (
              <div className="absolute right-0 top-9 bg-white border rounded-xl shadow-xl z-10 w-52 overflow-hidden">
                {STATUS_CIRCLES.map(s => (
                  <button
                    key={s.key}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${currentStatus === s.key ? 'font-bold bg-gray-50' : ''}`}
                    onClick={() => handleSelectStatus(s.key)}
                  >
                    <span className={`w-3 h-3 rounded-full ${s.color}`}></span>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
            title="Excluir agendamento"
            disabled={deleting}
            onClick={handleDeleteAppointment}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Status circles */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            {STATUS_CIRCLES.map(s => (
              <button
                key={s.key}
                title={s.label}
                onClick={() => handleSelectStatus(s.key)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all
                  ${currentStatus === s.key ? s.color + ' ring-2 ring-offset-1 ring-gray-400 scale-110' : 'bg-gray-200 text-gray-500'}`}
              >
                {s.short}
              </button>
            ))}
          </div>
          {/* Status banner */}
          <div className={`rounded-full py-1.5 text-center text-sm font-semibold text-white ${config.color}`}>
            {config.label}
          </div>
          {/* Save button when status changed */}
          {pendingStatus && (
            <button
              onClick={handleSaveStatus}
              disabled={loading}
              className="mt-2 w-full rounded-full py-2 text-sm font-bold text-white bg-gray-900 hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              {loading ? "Salvando..." : "💾 Salvar Status"}
            </button>
          )}
        </div>

        {/* Main content */}
        <div className="px-4 pb-4 space-y-4">
          {/* Title */}
          <div>
            <div className={`inline-block px-2 py-0.5 rounded text-white text-xs font-bold mb-1 ${config.color}`}>
              {appointment.sessions_used || '–'}/{appointment.max_sessions || '–'}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{appointment.service_type || 'Consulta'}</h2>
            <p className="text-sm text-gray-500">
              {dateStr} • {appointment.appointment_time} até {endTime}
            </p>
          </div>

          {/* Remark button for absences */}
          {(appointment.status === 'professional_absence' || appointment.status === 'justified_absence') && (
            <div className="flex items-center gap-3">
              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white h-8">
                <RefreshCw className="w-3 h-3 mr-1" /> Remarcar
              </Button>
              <span className="text-xs text-gray-500">Prazo máximo para remarcar: 30 dias</span>
            </div>
          )}

          {/* Patient */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{patient?.full_name || 'Paciente'}</p>
              <p className="text-xs text-blue-500 cursor-pointer hover:underline">Acesse aqui o resumo do cliente</p>
            </div>
          </div>

          {/* Confirmation */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckSquare className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Confirmação</p>
              <p className="text-sm text-orange-600 font-medium">
                {appointment.notes ? appointment.notes : `Conf. manual ${appointment.appointment_date ? format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy') : ''} às ${appointment.appointment_time}`}
              </p>
            </div>
            {appointment.status === 'confirmed' ? (
              <span title="Paciente já notificado por WhatsApp" className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckSquare className="w-3.5 h-3.5" /> Confirmado
              </span>
            ) : (
              <Button
                size="sm"
                className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                disabled={confirming}
                onClick={handleConfirmAppointment}
              >
                {confirming ? 'Confirmando...' : 'Confirmar'}
              </Button>
            )}
          </div>

          {/* Preliminary info */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HelpCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Informações preliminares</p>
              <p className="text-sm text-gray-600">Sem Informações preliminares</p>
            </div>
          </div>

          {/* Room */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Monitor className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sala</p>
              <p className="text-sm text-gray-700">{room?.room_name || 'Não definida'}</p>
            </div>
          </div>

          {/* Professional */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Profissional</p>
              <p className="text-sm text-gray-700">{professional?.full_name || 'Não definido'}</p>
            </div>
          </div>

          {/* Value */}
          {appointment.value > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Valor</p>
                <p className="text-sm font-semibold text-gray-700">R$ {appointment.value.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Footer button */}
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              className="w-full border-green-500 text-green-700 hover:bg-green-50"
              onClick={() => setShowPayment(true)}
            >
              <DollarSign className="w-4 h-4 mr-2" /> Acessar Cobrança(s)
            </Button>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          appointment={appointment}
          patient={patient}
          professional={professional}
          onClose={() => setShowPayment(false)}
          onPaid={() => { setShowPayment(false); onClose && onClose(); }}
        />
      )}
    </div>
  );
}