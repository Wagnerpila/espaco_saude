import React from "react";
import { MessageCircle, Edit, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInYears } from "date-fns";

// Lista de pacientes em ordem alfabética com letra separadora (estilo
// Master UP). Tocar na linha abre a ficha; WhatsApp e editar ficam à direita.
export default function PatientList({ patients, isLoading, onEdit, onSelect, selectedPatient }) {
  const handleWhatsApp = (patient, e) => {
    e.stopPropagation();
    const phoneNumber = patient.phone?.replace(/\D/g, '');
    const message = `Olá ${patient.full_name}! Como vai? Aqui é da Espaço Saúde.`;
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-11 h-11 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center">
        <User className="w-14 h-14 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Nenhum paciente encontrado</h3>
        <p className="text-gray-500">Tente ajustar a busca ou cadastre um novo paciente</p>
      </div>
    );
  }

  const sorted = [...patients].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "pt-BR"));
  const groups = [];
  for (const p of sorted) {
    const letter = (p.full_name?.[0] || "#").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
    if (!groups.length || groups[groups.length - 1].letter !== letter) groups.push({ letter, items: [] });
    groups[groups.length - 1].items.push(p);
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
      {groups.map(group => (
        <div key={group.letter}>
          <div className="px-4 pt-3 pb-1 text-sm font-medium text-gray-400">{group.letter}</div>
          {group.items.map(patient => {
            const selected = selectedPatient?.id === patient.id;
            return (
              <div
                key={patient.id}
                onClick={() => onSelect(patient)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected ? "bg-pink-50 dark:bg-pink-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
              >
                <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 dark:text-gray-200 font-semibold">{patient.full_name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0 border-b border-gray-100 dark:border-gray-800 pb-2.5 -mb-2.5">
                  <p className={`text-[16px] truncate ${patient.active === false ? "text-gray-400" : "text-gray-900 dark:text-white"}`}>
                    {patient.full_name}
                    {patient.active === false && <span className="ml-2 text-xs text-gray-400">(inativo)</span>}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {patient.phone}
                    {patient.birth_date && ` · ${differenceInYears(new Date(), new Date(patient.birth_date))} anos`}
                  </p>
                </div>
                <button onClick={(e) => handleWhatsApp(patient, e)} className="p-2 rounded-full text-green-600 hover:bg-green-50" aria-label="WhatsApp">
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onEdit(patient); }} className="p-2 rounded-full text-gray-400 hover:bg-gray-100" aria-label="Editar">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
