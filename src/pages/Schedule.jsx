import React, { useState, useEffect } from "react";
import { Appointment, Patient, Professional, Room } from "@/entities/all";
// Added MessageCircle, kept Phone as per outline
import { format, addDays, subDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import ScheduleHeader from "../components/schedule/ScheduleHeader";
import DayView from "../components/schedule/DayView";
import TimeGridView from "../components/schedule/TimeGridView";
import WeekView from "../components/schedule/WeekView";
import AppointmentForm from "../components/schedule/AppointmentForm";

export default function SchedulePage() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day");
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
      if (editingAppointment) {
        await Appointment.update(editingAppointment.id, appointmentData);
      } else {
        await Appointment.create(appointmentData);
      }
      setShowForm(false);
      setEditingAppointment(null);
      setSelectedSlot(null);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      toast.error(error.response?.data?.error || "Erro ao salvar agendamento");
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
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
  };

  const navigateDate = (direction) => {
    if (direction === "prev") {
      setCurrentDate(viewMode === "day" ? subDays(currentDate, 1) : subDays(currentDate, 7));
    } else {
      setCurrentDate(viewMode === "day" ? addDays(currentDate, 1) : addDays(currentDate, 7));
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-purple-50 via-orange-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <ScheduleHeader
          currentDate={currentDate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigateDate={navigateDate}
          onNewAppointment={() => setShowForm(true)}
        />

        {showForm && (
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
        )}

        {viewMode === "day" ? (
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
    </div>
  );
}