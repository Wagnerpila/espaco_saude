import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const VIEW_MODES = [
  { id: "list", label: "Lista" },
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
];

export default function ScheduleHeader({
  currentDate,
  viewMode,
  setViewMode,
  navigateDate,
  onNewAppointment,
  onExportPdf
}) {
  const getDateRange = () => {
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="bg-white dark:bg-gray-900 md:bg-transparent md:dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-0 px-3 py-2 md:px-0 md:pt-0 md:pb-4 flex flex-wrap items-center gap-2">
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-1">
        {VIEW_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${viewMode === m.id ? "bg-white dark:bg-gray-700 shadow-sm text-brand font-semibold" : "text-gray-600 dark:text-gray-300"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {viewMode !== "list" && (
        <div className="flex items-center gap-1 order-last w-full md:order-none md:w-auto">
          <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")} aria-label="Anterior">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="flex-1 md:flex-none text-center text-sm md:text-base font-medium text-gray-800 dark:text-gray-100 capitalize">{getDateRange()}</span>
          <Button variant="ghost" size="icon" onClick={() => navigateDate("next")} aria-label="Próximo">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onExportPdf} title="Gerar PDF da agenda do dia exibido" className="rounded-full">
          <FileDown className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Imprimir PDF</span>
        </Button>
        <Button onClick={onNewAppointment} size="sm" className="hidden md:inline-flex rounded-full bg-brand hover:opacity-90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>
    </div>
  );
}
