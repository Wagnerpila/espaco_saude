import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, Search, Check } from "lucide-react";

// Escolha de paciente em tela cheia (estilo Master UP): no celular ocupa a
// tela toda, no computador vira uma janela central. É uma tela própria, sem
// Select/Popover — por isso o teclado do Android abrindo não a fecha.
export default function PatientPicker({ patients, value, onChange, bare = false }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const inputRef = useRef(null);
  const selected = patients.find(p => p.id === value);

  useEffect(() => {
    if (!open) return;
    setTerm("");
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [open]);

  const groups = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = patients
      .filter(p => !t || p.full_name?.toLowerCase().includes(t) || p.phone?.includes(term.trim()))
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "pt-BR"));
    const out = [];
    for (const p of list) {
      const letter = (p.full_name?.[0] || "#").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
      if (!out.length || out[out.length - 1].letter !== letter) out.push({ letter, items: [] });
      out[out.length - 1].items.push(p);
    }
    return out;
  }, [patients, term]);

  const choose = (id) => { onChange(id); setOpen(false); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={bare
          ? "flex h-11 items-center justify-end gap-2 bg-transparent text-[15px] min-w-0 max-w-full focus:outline-none"
          : "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"}
      >
        <span className={`truncate ${selected ? "" : "text-brand"}`}>{selected ? selected.full_name : "Selecionar paciente"}</span>
        <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-stretch md:items-center justify-center md:bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="bg-white dark:bg-gray-900 w-full md:max-w-md md:h-[80vh] md:rounded-2xl flex flex-col overflow-hidden"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2 py-2 border-b border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Voltar">
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              </button>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Pacientes ({patients.length})</span>
            </div>
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Buscar paciente"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-[16px] outline-none dark:text-white"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {groups.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum paciente encontrado.</p>}
              {groups.map(g => (
                <div key={g.letter}>
                  <div className="px-4 pt-3 pb-1 text-sm font-medium text-gray-400">{g.letter}</div>
                  {g.items.map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => choose(p.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-semibold text-gray-600 dark:text-gray-200 flex-shrink-0">
                        {p.full_name?.[0]}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[16px] text-gray-900 dark:text-white truncate">{p.full_name}</span>
                        <span className="block text-sm text-gray-500 truncate">{p.phone}</span>
                      </span>
                      {p.id === value && <Check className="w-5 h-5 text-brand" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
