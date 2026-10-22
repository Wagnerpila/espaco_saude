import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Appointment, Patient, Professional, Room } from "@/entities/all";
// Added MessageCircle, kept Phone as per outline
import { format, addDays, subDays, startOfWeek, parseISO, isValid } from "date-fns";
import { Plus } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { exportScheduleToPdf } from "../utils/scheduleExport";

import ScheduleHeader from "../components/schedule/ScheduleHeader";
import DayView from "../components/schedule/DayView";
import TimeGridView from "../components/schedule/TimeGridView";
import AgendaListView from "../components/schedule/AgendaListView";
import WeekView from "../components/schedule/WeekView";
import AppointmentForm from "../components/schedule/AppointmentForm";
import ConfirmNewAppointmentDialog from "../components/schedule/ConfirmNewAppointmentDialog";

export default function SchedulePage() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  // ?date=yyyy-MM-dd abre a agenda naquele dia (links do painel) e ?novo=1
  // já abre o formulário de novo agendamento.
  const [currentDate, setCurrentDate] = useState(() => {
    const d = searchParams.get("date") ? parseISO(searchParams.get("date")) : null;
    return d && isValid(d) ? d : new Date();
  });
  const [viewMode, setViewMode] = useState("list");
  const [showForm, setShowForm] = useState(() => searchParams.get("novo") === "1");
  const [editingAppointment, setEditingAppointment] = useState(null);
  // ?paciente=ID (botão "Agendar" da ficha do paciente) já escolhe o paciente.
  const [selectedSlot, setSelectedSlot] = useState(() =>
    searchParams.get("paciente") ? { patientId: searchParams.get("paciente") } : null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [appointmentToConfirm, setAppointmentToConfirm] = useState(null);

  // ?editar=ID (botão "Editar" do cartão da consulta no painel) abre a edição
  // assim que os agendamentos carregam.
  const [editIdFromUrl] = useState(() => searchParams.get("editar"));

  useEffect(() => {
    loadData();
    if (["novo", "date", "paciente", "editar"].some(k => searchParams.has(k))) setSearchParams({}, { replace: true });
  }, []);

  useEffect(() => {
    if (!editIdFromUrl || appointments.length === 0) return;
    const apt = appointments.find(a => a.id === editIdFromUrl);
    if (apt && !showForm) {
      setCurrentDate(parseISO(apt.appointment_date));
      handleEditAppointment(apt);
    }
  }, [appointments]);

  const openNewAppointment = () => {
    setEditingAppointment(null);
    setSelectedSlot(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appointmentsData, patientsData, professionalsData, roomsData] = await Promise.all([
        Appointment.list("-appointment_date"),
        Patient.filter({ active: true }),
        Professional.filter({ active: true }),
        Room.filter({ active: true })
      ]);
      
      setAppointments(appointmentsData);
      setPatients(patientsData);
      setProfessionals(professionalsData);
      setRooms(roomsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (appointmentData) => {
    try {
      const saved = editingAppointment
        ? await Appointment.update(editingAppointment.id, appointmentData)
        : await Appointment.create(appointmentData);
      setShowForm(false);
      setEditingAppointment(null);
      setSelectedSlot(null);
      loadData();
      // Agendamento novo e ainda pendente: pede a confirmação na hora, que é
      // o que dispara o WhatsApp de confirmação pro paciente.
      if (!editingAppointment && saved?.id && saved.status === "pending") {
        setAppointmentToConfirm(saved);
      }
      return saved;
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      toast.error(error.response?.data?.error || "Erro ao salvar agendamento");
      throw error;
    }
  };

  const handleSendReminder = (appointment) => {
    const patient = patients.find(p => p.id === appointment.patient_id);
    if (!patient?.phone) {
      alert("Este paciente não possui um número de telefone cadastrado.");
      return;
    }

    // Correct parsing of appointment_date to avoid timezone issues
    const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00');
    const confirmUrl = `${window.location.origin}/ConfirmAppointment?id=${appointment.id}`;
    const dataFormatada = format(appointmentDate, "dd/MM/yyyy", { locale: ptBR });
    const lines = [
      "\uD83C\uDFE5 *Espa\u00e7o Sa\u00fade* \uD83C\uDFE5",
      "",
      `Ol\u00e1 ${patient.full_name}!`,
      "",
      `Lembramos do seu agendamento para o dia *${dataFormatada}* \u00e0s *${appointment.appointment_time}*.`,
      "",
      `\uD83D\uDCCB Clique Aqui para Confirmar ou Cancelar Consulta:\n${confirmUrl}`,
      "",
      "Atenciosamente,",
      "Equipe Espa\u00e7o Sa\u00fade",
      "\uD83D\uDC99 Est\u00e9tica \u2022 Fisioterapia \u2022 Pilates"
    ];
    const message = lines.join("\n");

    const phoneNumber = patient.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleTimeSlotClick = (date, time, professionalId) => {
    setSelectedSlot({ date, time, professionalId });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportPdf = () => {
    exportScheduleToPdf(currentDate, appointments, patients, professionals, rooms);
  };

  const navigateDate = (direction) => {
    if (direction === "prev") {
      setCurrentDate(viewMode === "week" ? subDays(currentDate, 7) : subDays(currentDate, 1));
    } else {
      setCurrentDate(viewMode === "week" ? addDays(currentDate, 7) : addDays(currentDate, 1));
    }
  };

  return (
    <div className="md:p-6 bg-app min-h-screen">
      <div className="max-w-7xl mx-auto">
        <ScheduleHeader
          currentDate={currentDate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigateDate={navigateDate}
          onNewAppointment={openNewAppointment}
          onExportPdf={handleExportPdf}
        />

        {showForm && (
          <div className="p-3 md:p-0">
          <AppointmentForm
            appointment={editingAppointment}
            selectedSlot={selectedSlot}
            patients={patients}
            professionals={professionals}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingAppointment(null);
              setSelectedSlot(null);
            }}
          />
          </div>
        )}

        {appointmentToConfirm && (
          <ConfirmNewAppointmentDialog
            appointment={appointmentToConfirm}
            patient={patients.find(p => p.id === appointmentToConfirm.patient_id)}
            professional={professionals.find(p => p.id === appointmentToConfirm.professional_id)}
            onClose={() => setAppointmentToConfirm(null)}
            onConfirmed={loadData}
          />
        )}

        {viewMode === "list" ? (
          <AgendaListView
            date={currentDate}
            onSelectDate={setCurrentDate}
            appointments={appointments}
            professionals={professionals}
            patients={patients}
            rooms={rooms}
            isLoading={isLoading}
            onTimeSlotClick={handleTimeSlotClick}
            onEditAppointment={handleEditAppointment}
            onChanged={loadData}
          />
        ) : viewMode === "day" ? (
          <TimeGridView
            date={currentDate}
            appointments={appointments}
            professionals={professionals}
            patients={patients}
            rooms={rooms}
            isLoading={isLoading}
            onTimeSlotClick={handleTimeSlotClick}
            onEditAppointment={handleEditAppointment}
            onSendReminder={handleSendReminder}
          />
        ) : (
          <WeekView
            weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
            appointments={appointments}
            professionals={professionals}
            patients={patients}
            rooms={rooms}
            isLoading={isLoading}
            onTimeSlotClick={handleTimeSlotClick}
            onEditAppointment={handleEditAppointment}
            onSendReminder={handleSendReminder}
          />
        )}
      </div>

      {/* Botão flutuante de novo agendamento no celular */}
      {!showForm && (
        <button
          onClick={openNewAppointment}
          className="md:hidden fixed right-4 z-30 w-14 h-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center"
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          aria-label="Novo agendamento"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}