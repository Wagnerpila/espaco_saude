import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Search, ChevronDown, Bold, Italic, Strikethrough, Underline, List } from "lucide-react";
import { base44 } from "@/api/base44Client";

const { MedicalRecordTemplate, Equipment, ExerciseItem, MedicalRecord } = base44.entities;

const TABS = ["DESCRIÇÃO", "APARELHOS/EXERC.", "MEDIDAS", "HISTÓRICO"];

export default function EvolutionModal({ appointment, patient, professional, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState("DESCRIÇÃO");
  const [modelType, setModelType] = useState("clickable"); // classic | clickable
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [checkedFields, setCheckedFields] = useState({});
  const [description, setDescription] = useState("");

  // Equipment / exercise state
  const [equipments, setEquipments] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedEquipments, setSelectedEquipments] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    MedicalRecordTemplate.filter({ active: true }).then(setTemplates);
    Equipment.filter({ active: true }).then(setEquipments);
    ExerciseItem.filter({ active: true }).then(setExercises);
  }, []);

  const handleTemplateSelect = (tpl) => {
    setSelectedTemplate(tpl);
    setCheckedFields({});
    setShowTemplateDropdown(false);
  };

  const toggleField = (field) => setCheckedFields(prev => ({ ...prev, [field]: !prev[field] }));
  const toggleEquipment = (id) => setSelectedEquipments(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleExercise = (id) => setSelectedExercises(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSave = async () => {
    setSaving(true);
    const checkedList = selectedTemplate?.checkbox_fields?.filter(f => checkedFields[f]) || [];
    await MedicalRecord.create({
      patient_id: appointment.patient_id,
      professional_id: appointment.professional_id,
      appointment_id: appointment.id,
      session_date: appointment.appointment_date,
      diagnosis: selectedTemplate?.name || "Evolução",
      treatment: checkedList.join(", "),
      observations: description,
      next_session_notes: "",
      attachments: []
    });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  const filteredEquipments = equipments.filter(e => e.name.toLowerCase().includes(equipmentSearch.toLowerCase()));
  const filteredExercises = exercises.filter(e => e.name.toLowerCase().includes(exerciseSearch.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Prontuário de {patient?.full_name}</h2>
              <p className="text-sm text-gray-500">(sessão {appointment.appointment_date} {appointment.appointment_time})</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-purple-600 text-white text-xs">Profissional: {professional?.full_name || 'N/A'}</Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs">Multimídias</Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Modelo de prontuário:</span>
            <button
              onClick={() => setModelType("classic")}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${modelType === "classic" ? "bg-gray-200 border-gray-400 text-gray-800" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            >Clássico</button>
            <button
              onClick={() => setModelType("clickable")}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${modelType === "clickable" ? "bg-purple-600 border-purple-600 text-white" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            >Clicável</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "DESCRIÇÃO" && (
            <div className="space-y-4">
              {/* Template selector */}
              <div className="relative">
                <button
                  onClick={() => setShowTemplateDropdown(v => !v)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between bg-white hover:border-gray-300 transition-colors"
                >
                  <span className={selectedTemplate ? "text-gray-900 font-medium" : "text-gray-400"}>
                    {selectedTemplate?.name || "Escolha um modelo de prontuário para iniciar"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showTemplateDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-56 overflow-y-auto mt-1">
                    {templates.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500">Nenhum modelo cadastrado.</p>
                    ) : (
                      templates.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => handleTemplateSelect(tpl)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          {tpl.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {!selectedTemplate && (
                <p className="text-xs text-gray-400 text-center">Para cadastrar modelos acesse o menu Cadastros Clínicos - Prontuários Clicáveis.</p>
              )}

              {/* Checkbox fields */}
              {selectedTemplate && selectedTemplate.checkbox_fields?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{selectedTemplate.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate.checkbox_fields.map(field => (
                      <label key={field} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!checkedFields[field]}
                          onChange={() => toggleField(field)}
                          className="w-4 h-4 accent-purple-600"
                        />
                        <span className="text-sm text-gray-700">{field}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Description text area with mini toolbar */}
              {selectedTemplate && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Outro. Descreva aqui</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
                      {[Bold, Italic, Strikethrough, Underline, List].map((ToolIcon, i) => (
                        <button key={i} className="p-1 rounded hover:bg-gray-200 transition-colors">
                          <ToolIcon className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Descreva observações adicionais..."
                      className="border-0 rounded-none min-h-[100px] text-sm focus-visible:ring-0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "APARELHOS/EXERC." && (
            <div className="space-y-4">
              {/* Selected summary */}
              {(selectedEquipments.length > 0 || selectedExercises.length > 0) && (
                <div className="bg-purple-50 rounded-lg p-3">
                  {selectedEquipments.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-purple-700 mb-1">Aparelhos selecionados:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedEquipments.map(id => {
                          const eq = equipments.find(e => e.id === id);
                          return eq ? <Badge key={id} className="bg-purple-100 text-purple-800 text-xs">{eq.name}</Badge> : null;
                        })}
                      </div>
                    </div>
                  )}
                  {selectedExercises.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 mb-1">Exercícios selecionados:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedExercises.map(id => {
                          const ex = exercises.find(e => e.id === id);
                          return ex ? <Badge key={id} className="bg-orange-100 text-orange-800 text-xs">{ex.name}</Badge> : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowEquipmentModal(true)}>
                <span className="w-6 h-6 rounded bg-gray-700 text-white text-xs flex items-center justify-center font-bold">A</span>
                Selecionar Aparelhos
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowExerciseModal(true)}>
                <span className="w-6 h-6 rounded bg-gray-700 text-white text-xs flex items-center justify-center font-bold">E</span>
                Selecionar Exercícios
              </Button>

              <p className="text-xs text-gray-400 text-center">Você pode cadastrar aparelhos e exercícios em Cadastros Clínicos.</p>
            </div>
          )}

          {activeTab === "MEDIDAS" && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Sem medidas registradas.</p>
            </div>
          )}

          {activeTab === "HISTÓRICO" && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Sem histórico registrado.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-between">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Aguardar..."}
          </Button>
        </div>
      </div>

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-end justify-center sm:items-center p-4" onClick={() => setShowEquipmentModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">Aparelhos</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowEquipmentModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar"
                  className="pl-9 h-9"
                  value={equipmentSearch}
                  onChange={e => setEquipmentSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto px-4 py-2">
              {filteredEquipments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum aparelho encontrado.<br/>Cadastre em Cadastros Clínicos.</p>
              ) : (
                filteredEquipments.map(eq => (
                  <label key={eq.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer">
                    <input type="checkbox" checked={selectedEquipments.includes(eq.id)} onChange={() => toggleEquipment(eq.id)} className="w-4 h-4 accent-purple-600" />
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(eq.abbreviation || eq.name.substring(0,2)).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-800">{eq.name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t flex justify-end">
              <Button className="bg-gray-800 text-white hover:bg-gray-900" onClick={() => setShowEquipmentModal(false)}>Selecionar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-end justify-center sm:items-center p-4" onClick={() => setShowExerciseModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">Exercícios</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowExerciseModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input placeholder="Buscar" className="pl-9 h-9" value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto px-4 py-2">
              {filteredExercises.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum exercício encontrado.<br/>Cadastre em Cadastros Clínicos.</p>
              ) : (
                filteredExercises.map(ex => (
                  <label key={ex.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer">
                    <input type="checkbox" checked={selectedExercises.includes(ex.id)} onChange={() => toggleExercise(ex.id)} className="w-4 h-4 accent-purple-600" />
                    <span className="text-sm text-gray-800">{ex.name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t flex justify-end">
              <Button className="bg-gray-800 text-white hover:bg-gray-900" onClick={() => setShowExerciseModal(false)}>Selecionar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}