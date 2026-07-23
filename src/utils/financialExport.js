import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS = {
  paid: "Pago",
  pending: "Pendente",
  cancelled: "Cancelado",
};

function truncate(str, max) {
  if (!str) return "-";
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function formatCurrency(value) {
  return (value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

const COLUMNS = [
  { label: "Descrição", x: 14, maxChars: 42 },
  { label: "Profissional", x: 115, maxChars: 24 },
  { label: "Status", x: 185, maxChars: 12 },
  { label: "Valor (R$)", x: 215, maxChars: 22 },
];

// Calcula a comissão do profissional sobre um valor de receita, usando o
// percentual padrão cadastrado no cadastro do profissional (mesma regra
// aplicada em PaymentModal e no gerador de comissões do backend).
function calcCommission(amount, professional) {
  const percentage = professional?.default_commission_percentage || 0;
  if (!percentage) return 0;
  return ((amount || 0) * percentage) / 100;
}

// Profissional com 100% de comissão é o dono/administrador da clínica —
// o valor não é repasse a terceiro, então não entra nos totais de comissão.
function isClinicOwner(professional) {
  return professional?.default_commission_percentage === 100;
}

// Status do agendamento em que a sessão não aconteceu — quando encontramos
// um desses vinculados a uma receita ainda "pending", mostramos esse motivo
// no lugar de "Pendente" (ver getAttendanceStatus).
const APPOINTMENT_STATUS_LABELS = {
  no_show: "Não Compareceu",
  justified_absence: "Ausência Justificada",
  professional_absence: "Ausência Profissional",
  null_absence: "Ausência Nula",
  cancelled: "Agend. Cancelado",
};

export const ATTENDANCE_COLORS = {
  no_show: { bg: "#fee2e2", text: "#b91c1c", badge: "bg-red-100 text-red-700" },
  justified_absence: { bg: "#ede9fe", text: "#6d28d9", badge: "bg-purple-100 text-purple-700" },
  professional_absence: { bg: "#ffedd5", text: "#c2410c", badge: "bg-orange-100 text-orange-700" },
  null_absence: { bg: "#f3f4f6", text: "#4b5563", badge: "bg-gray-100 text-gray-600" },
  cancelled: { bg: "#fee2e2", text: "#b91c1c", badge: "bg-red-100 text-red-700" },
  scheduled: { bg: "#dbeafe", text: "#1d4ed8", badge: "bg-blue-100 text-blue-700" },
};

// Uma receita "pending" só deveria significar "atendimento confirmado, ainda
// não pago". Se o agendamento vinculado mostra que a sessão não aconteceu
// (não compareceu/ausência/cancelado) ou ainda nem aconteceu (agendado pro
// futuro), este status substitui o "Pendente" genérico na exibição.
// Casamento: appointment_id direto quando existe, senão paciente + data
// (cobre faturas de pacote, que não têm appointment_id salvo).
export function getAttendanceStatus(transaction, appointments = []) {
  if (transaction.type !== "income" || transaction.payment_status !== "pending") return null;

  let appt = transaction.appointment_id
    ? appointments.find((a) => a.id === transaction.appointment_id)
    : null;
  if (!appt) {
    appt = appointments.find(
      (a) => a.patient_id === transaction.patient_id && a.appointment_date === transaction.transaction_date
    );
  }
  if (!appt) return null;

  if (APPOINTMENT_STATUS_LABELS[appt.status]) {
    return { key: appt.status, label: APPOINTMENT_STATUS_LABELS[appt.status] };
  }
  if (appt.status === "pending" || appt.status === "confirmed") {
    return { key: "scheduled", label: "Agendado" };
  }
  return null;
}

// Gera um PDF com todas as transações financeiras (receitas e despesas) de um
// dia específico, com os mesmos totais exibidos na tela de Financeiro —
// pra imprimir e fechar o caixa do dia.
export function exportDailyFinancialReportToPdf(dateStr, transactions, patients, professionals, professionalId, appointments = []) {
  const dayTransactions = transactions
    .filter((t) => t.transaction_date === dateStr)
    .filter((t) => !professionalId || professionalId === "all" || t.professional_id === professionalId)
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "income" ? -1 : 1));

  // Cancelado (sessão que não aconteceu) continua listado na tabela — pra
  // rastreabilidade — mas nunca soma nos totais do dia.
  const income = dayTransactions.filter((t) => t.type === "income" && t.payment_status !== "cancelled");
  const expense = dayTransactions.filter((t) => t.type === "expense" && t.payment_status !== "cancelled");
  const totalIncome = income.reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = expense.reduce((s, t) => s + (t.amount || 0), 0);
  const totalCommission = income.reduce((s, t) => {
    const professional = professionals.find((p) => p.id === t.professional_id);
    if (isClinicOwner(professional)) return s;
    return s + calcCommission(t.amount, professional);
  }, 0);

  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const selectedProfessional = professionalId && professionalId !== "all"
    ? professionals.find((p) => p.id === professionalId)
    : null;

  doc.setFontSize(16);
  doc.text("Clínica Espaço Saúde", 14, 16);
  doc.setFontSize(11);
  const dateObj = new Date(`${dateStr}T00:00:00`);
  doc.text(`Relatório Financeiro de ${format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 14, 24);
  if (selectedProfessional) {
    doc.setFontSize(10);
    doc.text(`Profissional: ${selectedProfessional.full_name}`, 14, 30);
  }

  let y = selectedProfessional ? 38 : 34;
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  COLUMNS.forEach((c) => doc.text(c.label, c.x, y));
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;
  doc.setFont(undefined, "normal");

  if (dayTransactions.length === 0) {
    doc.text("Nenhuma transação neste dia.", 14, y);
    y += 8;
  }

  for (const t of dayTransactions) {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
    const professional = professionals.find((p) => p.id === t.professional_id);
    const hasCommission = t.type === "income" && t.payment_status !== "cancelled" && professional?.default_commission_percentage > 0 && !isClinicOwner(professional);
    const attendance = getAttendanceStatus(t, appointments);

    doc.text(truncate(t.description, COLUMNS[0].maxChars), COLUMNS[0].x, y);
    doc.text(truncate(professional?.full_name, COLUMNS[1].maxChars), COLUMNS[1].x, y);
    if (attendance) {
      doc.setTextColor(ATTENDANCE_COLORS[attendance.key]?.text || "#000000");
      doc.text(attendance.label, COLUMNS[2].x, y);
      doc.setTextColor("#000000");
    } else {
      doc.text(STATUS_LABELS[t.payment_status] || t.payment_status || "-", COLUMNS[2].x, y);
    }

    // Valor a receber: quando a receita está vinculada a um profissional com
    // comissão cadastrada, mostra o valor final dele (já com o % aplicado),
    // não o valor bruto cobrado do paciente.
    if (hasCommission) {
      const commission = calcCommission(t.amount, professional);
      doc.setTextColor("#7c3aed");
      doc.text(`R$ ${formatCurrency(commission)} (${professional.default_commission_percentage}%)`, COLUMNS[3].x, y);
    } else {
      doc.setTextColor(t.type === "income" ? "#16803c" : "#dc2626");
      doc.text(`${t.type === "income" ? "+" : "-"} R$ ${formatCurrency(t.amount)}`, COLUMNS[3].x, y);
    }
    doc.setTextColor("#000000");
    y += 8;
  }

  y += 4;
  if (y > pageHeight - 30) {
    doc.addPage();
    y = 20;
  }
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFont(undefined, "bold");
  doc.setFontSize(10);
  doc.setTextColor("#16803c");
  doc.text(`Total Receitas: R$ ${formatCurrency(totalIncome)}`, 14, y);
  doc.setTextColor("#dc2626");
  doc.text(`Total Despesas: R$ ${formatCurrency(totalExpense)}`, 90, y);
  doc.setTextColor("#7c3aed");
  doc.text(`Total Comissões: R$ ${formatCurrency(totalCommission)}`, 166, y);
  doc.setTextColor("#000000");
  doc.setFont(undefined, "normal");
  y += 8;

  doc.setFont(undefined, "bold");
  doc.setTextColor(totalIncome - totalExpense >= 0 ? "#2563eb" : "#dc2626");
  doc.text(`Saldo do Dia: R$ ${formatCurrency(totalIncome - totalExpense)}`, 14, y);
  doc.setTextColor("#111827");
  doc.text(`Saldo Líquido (após comissões): R$ ${formatCurrency(totalIncome - totalExpense - totalCommission)}`, 90, y);
  doc.setTextColor("#000000");
  doc.setFont(undefined, "normal");

  doc.setFontSize(8);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, pageHeight - 8);

  doc.save(`financeiro_${dateStr}.pdf`);
}

// Gera um PDF só com o comprovante/recibo (não a página inteira) — o antigo
// botão "Imprimir" chamava window.print() puro, que imprimia a tela cheia do
// Financeiro (menu, cards, formulário) porque não isolava o comprovante.
export function exportReceiptToPdf(invoice) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 20;

  doc.setFillColor("#2563eb");
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text("COMPROVANTE DE SERVIÇO", pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text("Clínica Espaço Saúde", pageWidth / 2, 21, { align: "center" });

  y = 40;
  doc.setTextColor("#6b7280");
  doc.setFontSize(9);
  doc.text("Nº do Comprovante", margin, y);
  y += 6;
  doc.setTextColor("#2563eb");
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(invoice.receipt_number, margin, y);
  doc.setFont(undefined, "normal");
  y += 12;

  const rows = [
    ["Data", formatDateBR(invoice.issue_date)],
    ["Prestador", "Clínica Espaço Saúde"],
    ["Paciente", invoice._patient?.full_name || "—"],
    ...(invoice._patient?.cpf ? [["CPF", invoice._patient.cpf]] : []),
    ["Profissional", invoice._professional?.full_name || "—"],
    ["Serviço", invoice.service_description || "—"],
    ["Pagamento", invoice.payment_method || "—"],
  ];

  doc.setFontSize(10);
  for (const [label, value] of rows) {
    doc.setTextColor("#6b7280");
    doc.text(label, margin, y);
    doc.setTextColor("#111827");
    doc.setFont(undefined, "bold");
    doc.text(String(value), pageWidth - margin, y, { align: "right" });
    doc.setFont(undefined, "normal");
    doc.setDrawColor("#e5e7eb");
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 9;
  }

  y += 4;
  doc.setFillColor("#f0fdf4");
  const boxHeight = invoice.iss_aliquot > 0 ? 26 : 12;
  doc.rect(margin, y, pageWidth - margin * 2, boxHeight, "F");
  y += 8;
  doc.setTextColor("#374151");
  doc.text("Valor:", margin + 4, y);
  doc.setFont(undefined, "bold");
  doc.text(`R$ ${formatCurrency(invoice.gross_value)}`, pageWidth - margin - 4, y, { align: "right" });
  doc.setFont(undefined, "normal");

  if (invoice.iss_aliquot > 0) {
    y += 7;
    doc.setTextColor("#dc2626");
    doc.text(`ISS (${invoice.iss_aliquot}%):`, margin + 4, y);
    doc.text(`- R$ ${formatCurrency(invoice.iss_value)}`, pageWidth - margin - 4, y, { align: "right" });
    y += 7;
    doc.setTextColor("#15803d");
    doc.setFont(undefined, "bold");
    doc.text("Valor líquido:", margin + 4, y);
    doc.text(`R$ ${formatCurrency(invoice.net_value)}`, pageWidth - margin - 4, y, { align: "right" });
    doc.setFont(undefined, "normal");
  }
  doc.setTextColor("#000000");
  y += 14;

  if (invoice.notes) {
    doc.setFontSize(8);
    doc.setTextColor("#6b7280");
    doc.text("Observações", margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor("#374151");
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 5 + 4;
  }

  doc.setFontSize(8);
  doc.setTextColor("#9ca3af");
  doc.text(`Comprovante emitido em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, doc.internal.pageSize.getHeight() - 12);

  doc.save(`comprovante_${invoice.receipt_number}.pdf`);
}

function formatDateBR(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
