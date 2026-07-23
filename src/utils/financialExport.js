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

// Gera um PDF com todas as transações financeiras (receitas e despesas) de um
// dia específico, com os mesmos totais exibidos na tela de Financeiro —
// pra imprimir e fechar o caixa do dia.
export function exportDailyFinancialReportToPdf(dateStr, transactions, patients, professionals, professionalId) {
  const dayTransactions = transactions
    .filter((t) => t.transaction_date === dateStr)
    .filter((t) => !professionalId || professionalId === "all" || t.professional_id === professionalId)
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "income" ? -1 : 1));

  const income = dayTransactions.filter((t) => t.type === "income");
  const expense = dayTransactions.filter((t) => t.type === "expense");
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
    const hasCommission = t.type === "income" && professional?.default_commission_percentage > 0 && !isClinicOwner(professional);

    doc.text(truncate(t.description, COLUMNS[0].maxChars), COLUMNS[0].x, y);
    doc.text(truncate(professional?.full_name, COLUMNS[1].maxChars), COLUMNS[1].x, y);
    doc.text(STATUS_LABELS[t.payment_status] || t.payment_status || "-", COLUMNS[2].x, y);

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
