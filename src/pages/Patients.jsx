import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Patient } from "@/entities/Patient";
import { Appointment } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Cake, Moon, Sparkles, UserX, ChevronRight, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";

import PatientForm from "../components/patients/PatientForm";
import PatientList from "../components/patients/PatientList";
import PatientDetails from "../components/patients/PatientDetails";

const INACTIVE_AFTER_DAYS = 60;
const ACTIVE_STATUSES = new Set(["pending", "confirmed", "completed"]);

// Grupos automáticos no topo da lista (estilo Master UP). Cada um é só um
// filtro sobre os pacientes já carregados — nada é gravado.
const GROUPS = [
  { id: "birthdays", label: "Aniversariantes do mês", icon: Cake, color: "#f5a623" },
  { id: "inactive", label: `Sem atendimento há ${INACTIVE_AFTER_DAYS}+ dias`, icon: Moon, color: "#3f51b5" },
  { id: "new", label: "Novos este mês", icon: Sparkles, color: "#1fb6d4" },
  { id: "disabled", label: "Cadastros inativos", icon: UserX, color: "#6b7280" },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const [fetchedPatients, fetchedAppointments] = await Promise.all([
        Patient.list("-created_date"),
        Appointment.list(),
      ]);
      setPatients(fetchedPatients);
      setAppointments(fetchedAppointments);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => { loadPatients(); }, []);

  // Abre direto o resumo de um paciente específico quando a página é acessada
  // com ?patient_id=... (ex.: link "Acesse aqui o resumo do cliente" no popup
  // do agendamento na Agenda).
  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (!patientId || patients.length === 0) return;
    const found = patients.find((p) => p.id === patientId);
    if (found) setSelectedPatient(found);
  }, [searchParams, patients]);

  const groupMembers = useMemo(() => {
    const now = new Date();
    const month = format(now, "MM");
    const yearMonth = format(now, "yyyy-MM");
    const todayKey = format(now, "yyyy-MM-dd");
    const lastVisit = {};
    const hasFuture = new Set();
    for (const a of appointments) {
      if (!ACTIVE_STATUSES.has(a.status)) continue;
      if (a.appointment_date >= todayKey) hasFuture.add(a.patient_id);
      else if (!lastVisit[a.patient_id] || a.appointment_date > lastVisit[a.patient_id]) lastVisit[a.patient_id] = a.appointment_date;
    }
    const active = patients.filter(p => p.active !== false);
    return {
      birthdays: active.filter(p => p.birth_date && String(p.birth_date).slice(5, 7) === month),
      inactive: active.filter(p => lastVisit[p.id] && !hasFuture.has(p.id) && differenceInDays(now, parseISO(lastVisit[p.id])) >= INACTIVE_AFTER_DAYS),
      new: active.filter(p => String(p.created_date || "").slice(0, 7) === yearMonth),
      disabled: patients.filter(p => p.active === false),
    };
  }, [patients, appointments]);

  const filteredPatients = useMemo(() => {
    const base = activeGroup ? groupMembers[activeGroup] : patients;
    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase();
    return base.filter(patient =>
      patient.full_name?.toLowerCase().includes(term) ||
      patient.cpf?.includes(searchTerm) ||
      patient.phone?.includes(searchTerm)
    );
  }, [patients, groupMembers, activeGroup, searchTerm]);

  const handleSubmit = async (patientData) => {
    try {
      if (editingPatient) {
        await Patient.update(editingPatient.id, patientData);
      } else {
        await Patient.create(patientData);
      }
      setShowForm(false);
      setEditingPatient(null);
      loadPatients();
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
      toast.error(error.response?.data?.error || "Erro ao salvar paciente");
    }
  };

  const handleEdit = (patient) => {
    setSelectedPatient(null);
    setEditingPatient(patient);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openNew = () => {
    setEditingPatient(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeGroupInfo = GROUPS.find(g => g.id === activeGroup);

  const listColumn = (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl px-3 py-2 mb-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar por nome, CPF ou telefone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-[15px] outline-none focus:ring-2 focus:ring-pink-200 dark:text-white"
          />
        </div>
      </div>

      {activeGroupInfo ? (
        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 mb-3">
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: activeGroupInfo.color }}>
            <activeGroupInfo.icon className="w-4 h-4" />
          </span>
          <span className="flex-1 font-medium text-gray-900 dark:text-white">{activeGroupInfo.label}</span>
          <button onClick={() => setActiveGroup(null)} className="flex items-center gap-1 text-sm text-brand">
            <X className="w-4 h-4" /> limpar
          </button>
        </div>
      ) : !searchTerm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden mb-3">
          {GROUPS.map(g => (
            <button key={g.id} onClick={() => setActiveGroup(g.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: g.color }}>
                <g.icon className="w-4 h-4" />
              </span>
              <span className="flex-1 text-[15px] text-gray-800 dark:text-gray-100">{g.label}</span>
              <span className="text-gray-400 tabular-nums">{isLoading ? "" : groupMembers[g.id].length}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>
      )}

      <p className="px-2 pb-2 text-sm text-gray-500">{filteredPatients.length} paciente(s)</p>
      <PatientList patients={filteredPatients} isLoading={isLoading}
        onEdit={handleEdit} onSelect={setSelectedPatient} selectedPatient={selectedPatient} />
    </>
  );

  return (
    <div className="p-3 md:p-6 bg-app min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="hidden md:flex justify-end mb-4">
          <Button onClick={openNew} className="rounded-full bg-brand hover:opacity-90 text-white">
            <Plus className="w-4 h-4 mr-2" /> Novo Paciente
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <PatientForm
              patient={editingPatient}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingPatient(null); }}
            />
          )}
        </AnimatePresence>

        {/* Computador: lista + ficha lado a lado */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          <div>{listColumn}</div>
          <div className="sticky top-4">
            <PatientDetails patient={selectedPatient} onEdit={handleEdit} />
          </div>
        </div>

        {/* Celular: lista; a ficha abre em tela cheia */}
        <div className="lg:hidden">{listColumn}</div>
      </div>

      <AnimatePresence>
        {selectedPatient && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-app overflow-y-auto lg:hidden"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <button
              onClick={() => setSelectedPatient(null)}
              className="absolute left-3 z-10 p-2 rounded-full text-white hover:bg-white/15"
              style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
              aria-label="Voltar"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <PatientDetails patient={selectedPatient} onEdit={handleEdit} />
          </motion.div>
        )}
      </AnimatePresence>

      {!showForm && !selectedPatient && (
        <button
          onClick={openNew}
          className="md:hidden fixed right-4 z-30 w-14 h-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center"
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          aria-label="Novo paciente"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}
