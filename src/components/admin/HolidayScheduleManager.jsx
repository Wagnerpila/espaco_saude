import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarOff, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { blockAllProfessionalsForHolidays, listHolidayConflicts, cancelHolidayConflict } from "@/functions/holidayBlocks";

// Feriados nacionais + municipais de Imbaú/PR (ver server/src/services/holidays.js
// — mesma lista usada pro bloqueio automático de agenda).
const HOLIDAYS_2026 = [
  { date: "01/01/2026", reason: "Ano Novo (Nacional)" },
  { date: "19/03/2026", reason: "São José (Municipal - Imbaú)" },
  { date: "03/04/2026", reason: "Sexta-Feira Santa (Nacional)" },
  { date: "21/04/2026", reason: "Tiradentes (Nacional)" },
  { date: "01/05/2026", reason: "Dia do Trabalho (Nacional)" },
  { date: "07/09/2026", reason: "Independência do Brasil (Nacional)" },
  { date: "12/10/2026", reason: "Nossa Senhora Aparecida (Nacional)" },
  { date: "02/11/2026", reason: "Dia de Finados (Nacional)" },
  { date: "15/11/2026", reason: "Proclamação da República (Nacional)" },
  { date: "20/11/2026", reason: "Consciência Negra (Nacional)" },
  { date: "08/12/2026", reason: "Feriado Municipal - Imbaú" },
  { date: "25/12/2026", reason: "Natal (Nacional)" },
];

function formatDateBR(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function HolidayScheduleManager() {
  const [conflicts, setConflicts] = useState([]);
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(true);
  const [isBlocking, setIsBlocking] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadConflicts = async () => {
    setIsLoadingConflicts(true);
    try {
      const res = await listHolidayConflicts();
      setConflicts(res.data?.items || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao verificar agendamentos em feriados");
    }
    setIsLoadingConflicts(false);
  };

  useEffect(() => { loadConflicts(); }, []);

  const handleBlockAll = async () => {
    setIsBlocking(true);
    try {
      const res = await blockAllProfessionalsForHolidays();
      const { professionalsProcessed, blocksCreated } = res.data || {};
      toast.success(`Agenda bloqueada nos feriados: ${blocksCreated} bloqueio(s) novo(s) em ${professionalsProcessed} profissional(is).`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao bloquear agenda nos feriados");
    }
    setIsBlocking(false);
  };

  const handleCancelConflict = async (item) => {
    if (!window.confirm(`Cancelar o agendamento de ${item.patientName} em ${formatDateBR(item.appointmentDate)} e avisar por WhatsApp?`)) return;
    setBusyId(item.id);
    try {
      await cancelHolidayConflict({ appointmentId: item.id });
      toast.success(`Agendamento de ${item.patientName} cancelado e paciente avisado.`);
      setConflicts((prev) => prev.filter((c) => c.id !== item.id));
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao cancelar agendamento");
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5" />
            Feriados de Imbaú/PR — Bloqueio de Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Bloqueia automaticamente a agenda de todos os profissionais nos feriados nacionais e municipais
            (fonte: <a href="https://feriados.com.br/PR/Imbaú" target="_blank" rel="noreferrer" className="underline">feriados.com.br/PR/Imbaú</a>).
            Profissionais cadastrados a partir de agora já recebem esse bloqueio automaticamente.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {HOLIDAYS_2026.map((h) => (
              <span key={h.date} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                {h.date} — {h.reason}
              </span>
            ))}
          </div>

          <Button onClick={handleBlockAll} disabled={isBlocking} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <ShieldCheck className="w-4 h-4" />
            {isBlocking ? "Bloqueando..." : "Bloquear agenda de todos os profissionais"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="w-5 h-5" />
              Agendamentos em cima de feriados
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadConflicts} className="gap-1">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingConflicts ? (
            <p className="text-sm text-gray-500">Verificando...</p>
          ) : conflicts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum agendamento futuro caindo em feriado. 🎉</p>
          ) : (
            <div className="space-y-2">
              {conflicts.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border dark:border-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.patientName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateBR(item.appointmentDate)} às {item.appointmentTime}
                      {item.professionalName ? ` • ${item.professionalName}` : ""}
                      {item.serviceType ? ` • ${item.serviceType}` : ""}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">{item.holidayReason}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                    disabled={busyId === item.id}
                    onClick={() => handleCancelConflict(item)}
                  >
                    <Send className="w-3.5 h-3.5" /> Cancelar e avisar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
