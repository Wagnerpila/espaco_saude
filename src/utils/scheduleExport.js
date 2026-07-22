import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

function truncate(str, max) {
  if (!str) return "-";
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

const COLUMNS = [
  { label: "Horário", x: 14, maxChars: 8 },
  { label: "Paciente", x: 32, maxChars: 28 },
  { label: "Profissional", x: 90, maxChars: 22 },
  { label: "Serviço", x: 135, maxChars: 20 },
  { label: "Sala", x: 175, maxChars: 10 },
  { label: "Status", x: 195, maxChars: 12 },
];

// Gera um PDF da agenda de um dia específico (paciente, horário, profissional,
// sala e status), pra clínica poder imprimir e conferir no balcão sem precisar
// abrir o sistema. Reaproveita os mesmos dados já carregados em Schedule.jsx.
export function exportScheduleToPdf(date, appointments, patients, professionals, rooms) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayAppointments = appointments
    .filter((a) => a.appointment_date === dateStr && a.status !== "cancelled")
    .sort((a, b) => (a.appointment_time || "").localeCompare(b.appointment_time || ""));

  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(16);
  doc.text("Clínica Espaço Saúde", 14, 16);
  doc.setFontSize(11);
  doc.text(`Agenda de ${format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 14, 24);

  let y = 34;
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  COLUMNS.forEach((c) => doc.text(c.label, c.x, y));
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;
  doc.setFont(undefined, "normal");

  if (dayAppointments.length === 0) {
    doc.text("Nenhum agendamento neste dia.", 14, y);
  }

  for (const apt of dayAppointments) {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }
    const patient = patients.find((p) => p.id === apt.patient_id);
    const professional = professionals.find((p) => p.id === apt.professional_id);
    const room = rooms.find((r) => r.id === apt.room_id);

    doc.text(apt.appointment_time || "-", COLUMNS[0].x, y);
    doc.text(truncate(patient?.full_name, COLUMNS[1].maxChars), COLUMNS[1].x, y);
    doc.text(truncate(professional?.full_name, COLUMNS[2].maxChars), COLUMNS[2].x, y);
    doc.text(truncate(apt.service_type, COLUMNS[3].maxChars), COLUMNS[3].x, y);
    doc.text(truncate(room?.room_name, COLUMNS[4].maxChars), COLUMNS[4].x, y);
    doc.text(statusLabels[apt.status] || apt.status || "-", COLUMNS[5].x, y);
    y += 8;
  }

  doc.setFontSize(8);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, pageHeight - 8);

  doc.save(`agenda_${dateStr}.pdf`);
}
