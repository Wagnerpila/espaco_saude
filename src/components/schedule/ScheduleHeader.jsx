
import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ScheduleHeader({ 
  currentDate, 
  viewMode, 
  setViewMode, 
  navigateDate, 
  onNewAppointment 
}) {
  const getDateRange = () => {
    if (viewMode === "day") {
      return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`;
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateDate("prev")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-500" />
            Agenda
          </h1>
          <p className="text-gray-600 mt-1">{getDateRange()}</p>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateDate("next")}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("day")}
            className={viewMode === "day" ? "bg-white shadow-sm" : ""}
          >
            Dia
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
            className={viewMode === "week" ? "bg-white shadow-sm" : ""}
          >
            Semana
          </Button>
        </div>
        
        <Button 
          onClick={onNewAppointment}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>
    </div>
  );
}
