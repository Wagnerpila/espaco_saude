import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

// Calendário do mês no topo da agenda (estilo Master UP). `marked` é um Set
// de datas "yyyy-MM-dd" que têm atendimento — elas ganham um ponto embaixo.
export default function MonthCalendar({ selectedDate, onSelectDate, marked = new Set() }) {
  const [month, setMonth] = React.useState(startOfMonth(selectedDate));

  React.useEffect(() => {
    if (!isSameMonth(month, selectedDate)) setMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  const today = new Date();

  return (
    <div className="bg-white dark:bg-gray-900 px-3 pt-2 pb-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Mês anterior">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Próximo mês">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-500 pb-1">
        {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
      </div>

      <div className="grid grid-cols-7 text-center">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, month);
          const selected = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={key}
              onClick={() => onSelectDate(d)}
              className="flex flex-col items-center justify-center h-11"
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-[17px] transition-colors
                ${selected ? "bg-brand text-white font-semibold" : isToday ? "text-brand font-bold" : inMonth ? "text-gray-700 dark:text-gray-200" : "text-gray-300 dark:text-gray-600"}`}>
                {format(d, "d")}
              </span>
              <span className={`w-1 h-1 rounded-full -mt-0.5 ${marked.has(key) && !selected ? "bg-brand" : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
