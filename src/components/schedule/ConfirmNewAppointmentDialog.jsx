import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar, Clock, User, Stethoscope, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Appointment } from "@/entities/all";

// Aparece logo após criar um agendamento: o colaborador confere os dados e,
// ao confirmar, o agendamento vira "confirmed" — o que dispara a confirmação
// por WhatsApp pro paciente (hook em server/src/routes/entities.routes.js).
// "Agora não" deixa pendente; dá pra confirmar depois pelo card na agenda.
export default function ConfirmNewAppointmentDialog({ appointment, patient, professional, onClose, onConfirmed }) {
  const [confirming, setConfirming] = useState(false);

  if (!appointment) return null;

  const dateLabel = appointment.appointment_date
    ? format(new Date(appointment.appointment_date + "T00:00:00"), "EEEE, dd/MM/yyyy", { locale: ptBR })
    : "";

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await Appointment.update(appointment.id, { status: "confirmed" });
      toast.success(`Agendamento confirmado — WhatsApp enviado para ${patient?.full_name || "o paciente"}`);
      onConfirmed?.();
      onClose();
    } catch (error) {
      console.error("Erro ao confirmar agendamento:", error);
      toast.error(error.response?.data?.error || "Erro ao confirmar agendamento");
    }
    setConfirming(false);
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !confirming && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar agendamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Confira os dados. Ao confirmar, o paciente recebe a confirmação pelo WhatsApp.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 rounded-lg border bg-gray-50 dark:bg-gray-900 p-4 text-sm">
          <p className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-semibold">{patient?.full_name || "Paciente"}</span>
          </p>
          <p className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-gray-500" />
            {professional?.full_name || "Sem profissional"}
            {appointment.service_type ? ` • ${appointment.service_type}` : ""}
          </p>
          <p className="flex items-center gap-2 capitalize">
            <Calendar className="w-4 h-4 text-gray-500" />
            {dateLabel}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            {appointment.appointment_time}
          </p>
        </div>

        {!patient?.phone && (
          <p className="text-sm text-red-600">
            Este paciente não tem telefone cadastrado — a mensagem de WhatsApp não será enviada.
          </p>
        )}

        <AlertDialogFooter>
          <Button variant="outline" disabled={confirming} onClick={onClose}>
            Agora não
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={confirming} onClick={handleConfirm}>
            <MessageCircle className="w-4 h-4 mr-2" />
            {confirming ? "Confirmando..." : "Confirmar e enviar WhatsApp"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
