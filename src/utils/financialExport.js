import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const METHOD_LABELS = {
  cash: "Dinheiro",
  pix: "PIX",
  card: "Cartão",
  bank_transfer: "Transferência",
  pending: "Pendente",
};

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
  { label: "Descrição", x: 14, maxChars: 34 },
  { label: "Pessoa", x: 90, maxChars: 26 },
  { label: "Método", x: 145, maxChars: 14 },
  { label: "Status", x: 170, maxChars: 12 },
  { label: "Valor (R$)", x: 197, maxChars: 14 },
];

// Gera um PDF com todas as transações financeiras (receitas e despesas) de um
// dia específico, com os mesmos totais exibidos na tela de Financeiro —
// pra imprimir e fechar o caixa do dia.
export function exportDailyFinancialReportToPdf(dateStr, transactions, patients, professionals) {
  const dayTransactions = transactions
    .filter((t) => t.transaction_date === dateStr)
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "income" ? -1 : 1));

  const income = dayTransactions.filter((t) => t.type === "income");
  const expense = dayTransactions.filter((t) => t.type === "expense");
  const totalIncome = income.reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = expense.reduce((s, t) => s + (t.amount || 0), 0);

  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(16);
  doc.text("Clínica Espaço Saúde", 14, 16);
  doc.setFontSize(11);
  const dateObj = new Date(`${dateStr}T00:00:00`);
  doc.text(`Relatório Financeiro de ${format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 14, 24);

  let y = 34;
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
    const patient = patients.find((p) => p.id === t.patient_id);
    const professional = professionals.find((p) => p.id === t.professional_id);
    const personName = patient?.full_name || professional?.full_name;

    doc.text(truncate(t.description, COLUMNS[0].maxChars), COLUMNS[0].x, y);
    doc.text(truncate(personName, COLUMNS[1].maxChars), COLUMNS[1].x, y);
    doc.text(METHOD_LABELS[t.payment_method] || t.payment_method || "-", COLUMNS[2].x, y);
    doc.text(STATUS_LABELS[t.payment_status] || t.payment_status || "-", COLUMNS[3].x, y);
    doc.setTextColor(t.type === "income" ? "#16803c" : "#dc2626");
    doc.text(`${t.type === "income" ? "+" : "-"} ${formatCurrency(t.amount)}`, COLUMNS[4].x, y);
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
  doc.text(`Total Despesas: R$ ${formatCurrency(totalExpense)}`, 100, y);
  doc.setTextColor(totalIncome - totalExpense >= 0 ? "#2563eb" : "#dc2626");
  doc.text(`Saldo do Dia: R$ ${formatCurrency(totalIncome - totalExpense)}`, 190, y);
  doc.setTextColor("#000000");
  doc.setFont(undefined, "normal");

  doc.setFontSize(8);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, pageHeight - 8);

  doc.save(`financeiro_${dateStr}.pdf`);
}
