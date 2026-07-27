import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Patient } from "@/entities/Patient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import PatientForm from "../components/patients/PatientForm";
import PatientList from "../components/patients/PatientList";
import PatientDetails from "../components/patients/PatientDetails";

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const fetchedPatients = await Patient.list("-created_date");
      setPatients(fetchedPatients);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    }
    setIsLoading(false);
  };

  const filterPatients = useCallback(() => {
    if (!searchTerm) {
      setFilteredPatients(patients);
      return;
    }
    const filtered = patients.filter(patient =>
      patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf?.includes(searchTerm) ||
      patient.phone?.includes(searchTerm)
    );
    setFilteredPatients(filtered);
  }, [patients, searchTerm]);

  useEffect(() => { loadPatients(); }, []);
  useEffect(() => { filterPatients(); }, [filterPatients]);

  // Abre direto o resumo de um paciente específico quando a página é acessada
  // com ?patient_id=... (ex.: link "Acesse aqui o resumo do cliente" no popup
  // do agendamento na Agenda).
  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (!patientId || patients.length === 0) return;
    const found = patients.find((p) => p.id === patientId);
    if (found) setSelectedPatient(found);
  }, [searchParams, patients]);

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
  };

  const handleSelect = (patient) => {
    setSelectedPatient(patient);
  };

  const handleClose = () => {
    setSelectedPatient(null);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">Gestão de Pacientes</h1>
            <p className="text-gray-600 dark:text-gray-400">Cadastre e gerencie informações dos seus pacientes</p>
          </div>
          <Button onClick={() => { setEditingPatient(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
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

        {/* Desktop: grid layout */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-5 mb-5">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input placeholder="Buscar por nome, CPF ou telefone..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500" />
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <Users className="w-4 h-4" />
                {filteredPatients.length} paciente(s) encontrado(s)
              </div>
            </div>
            <PatientList patients={filteredPatients} isLoading={isLoading}
              onEdit={handleEdit} onSelect={handleSelect} selectedPatient={selectedPatient} />
          </div>
          <div>
            <PatientDetails patient={selectedPatient} onEdit={handleEdit} />
          </div>
        </div>

        {/* Mobile: list + modal overlay */}
        <div className="lg:hidden">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 mb-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input placeholder="Buscar por nome, CPF ou telefone..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500" />
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
              {filteredPatients.length} paciente(s) encontrado(s)
            </div>
          </div>
          <PatientList patients={filteredPatients} isLoading={isLoading}
            onEdit={handleEdit} onSelect={handleSelect} selectedPatient={selectedPatient} />
        </div>
      </div>

      {/* Mobile modal overlay */}
      <AnimatePresence>
        {selectedPatient && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={handleClose}
            />
            {/* Slide-up panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
              style={{ maxHeight: "90vh", overflowY: "auto" }}
            >
              {/* Close handle */}
              <div className="bg-white rounded-t-2xl">
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="flex items-center justify-end px-4 pb-1">
                  <Button variant="ghost" size="icon" onClick={handleClose} className="text-gray-400">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <PatientDetails patient={selectedPatient} onEdit={handleEdit} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}