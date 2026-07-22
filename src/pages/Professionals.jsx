import React, { useState, useEffect, useCallback } from "react";
import { Professional, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import ProfessionalForm from "../components/professionals/ProfessionalForm";
import ProfessionalList from "../components/professionals/ProfessionalList";
import ProfessionalDetails from "../components/professionals/ProfessionalDetails";

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [professionalsData, userData] = await Promise.all([
        Professional.list("-created_date"),
        User.me()
      ]);
      setProfessionals(professionalsData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
    }
    setIsLoading(false);
  };

  const filterProfessionals = useCallback(() => {
    if (!searchTerm) {
      setFilteredProfessionals(professionals);
      return;
    }
    const filtered = professionals.filter(professional =>
      professional.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.crefito?.includes(searchTerm)
    );
    setFilteredProfessionals(filtered);
  }, [professionals, searchTerm]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { filterProfessionals(); }, [filterProfessionals]);

  const handleSubmit = async (professionalData) => {
    try {
      if (editingProfessional) {
        await Professional.update(editingProfessional.id, professionalData);
      } else {
        await Professional.create(professionalData);
      }
      setShowForm(false);
      setEditingProfessional(null);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar profissional:", error);
      toast.error(error.response?.data?.error || "Erro ao salvar profissional");
    }
  };

  const handleEdit = (professional) => {
    setSelectedProfessional(null);
    setEditingProfessional(professional);
    setShowForm(true);
  };

  const handleSelect = (professional) => {
    setSelectedProfessional(professional);
  };

  const handleClose = () => {
    setSelectedProfessional(null);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">Gestão de Profissionais</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie a equipe de profissionais do consultório</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditingProfessional(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Profissional
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showForm && (
            <ProfessionalForm
              professional={editingProfessional}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingProfessional(null); }}
            />
          )}
        </AnimatePresence>

        {/* Desktop: grid layout */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-5 mb-5">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input placeholder="Buscar por nome, especialidade ou CREFITO..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <UserCheck className="w-4 h-4" />
                {filteredProfessionals.length} profissional(is) encontrado(s)
              </div>
            </div>
            <ProfessionalList professionals={filteredProfessionals} isLoading={isLoading}
              onEdit={isAdmin ? handleEdit : null} onSelect={handleSelect} selectedProfessional={selectedProfessional} />
          </div>
          <div>
            <ProfessionalDetails professional={selectedProfessional} onEdit={isAdmin ? handleEdit : null} currentUser={currentUser} />
          </div>
        </div>

        {/* Mobile: list only */}
        <div className="lg:hidden">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 mb-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input placeholder="Buscar por nome, especialidade ou CREFITO..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <UserCheck className="w-4 h-4" />
              {filteredProfessionals.length} profissional(is) encontrado(s)
            </div>
          </div>
          <ProfessionalList professionals={filteredProfessionals} isLoading={isLoading}
            onEdit={isAdmin ? handleEdit : null} onSelect={handleSelect} selectedProfessional={selectedProfessional} />
        </div>
      </div>

      {/* Mobile modal overlay */}
      <AnimatePresence>
        {selectedProfessional && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={handleClose}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 lg:hidden flex flex-col"
              style={{ maxHeight: "90vh" }}
            >
              <div className="bg-white rounded-t-2xl flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
                <div className="flex justify-center pt-2 pb-1 shrink-0">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="flex items-center justify-end px-4 pb-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={handleClose} className="text-gray-400">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="overflow-y-auto flex-1 pb-safe">
                  <ProfessionalDetails professional={selectedProfessional} onEdit={isAdmin ? handleEdit : null} currentUser={currentUser} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}