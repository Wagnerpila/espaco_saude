import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Edit, Trash2, Eye, EyeOff, X, Check, Tag } from "lucide-react";

const CATEGORIES = [
  { value: "pilates", label: "Pilates", color: "bg-purple-100 text-purple-800" },
  { value: "fisioterapia", label: "Fisioterapia", color: "bg-blue-100 text-blue-800" },
  { value: "estetica", label: "Estética", color: "bg-pink-100 text-pink-800" },
  { value: "psicologia", label: "Psicologia", color: "bg-yellow-100 text-yellow-800" },
  { value: "medico", label: "Médico", color: "bg-red-100 text-red-800" },
  { value: "outros", label: "Outros", color: "bg-gray-100 text-gray-800" },
];

function TemplateForm({ template, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: template?.name || "",
    category: template?.category || "pilates",
    description: template?.description || "",
    checkbox_fields: template?.checkbox_fields || [],
    active: template?.active !== undefined ? template.active : true,
  });
  const [newField, setNewField] = useState("");

  const addField = () => {
    const trimmed = newField.trim();
    if (!trimmed) return;
    setForm(f => ({ ...f, checkbox_fields: [...f.checkbox_fields, trimmed] }));
    setNewField("");
  };

  const removeField = (idx) => {
    setForm(f => ({ ...f, checkbox_fields: f.checkbox_fields.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Informe o nome do modelo.");
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{template ? "Editar Modelo" : "Novo Modelo de Prontuário"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome do Modelo *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Evolução Pilates" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} type="button"
                    className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition-all ${form.category === c.value ? 'border-blue-500 ' + c.color : 'border-transparent ' + c.color + ' opacity-60'}`}
                    onClick={() => setForm(f => ({ ...f, category: c.value }))}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição opcional do modelo" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Campos do Prontuário (checkboxes)</label>
              <div className="flex gap-2 mb-2">
                <Input value={newField} onChange={e => setNewField(e.target.value)} placeholder="Ex: Alongamento, Fortalecimento..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addField())} />
                <Button type="button" variant="outline" size="sm" onClick={addField}><Plus className="w-4 h-4" /></Button>
              </div>
              {form.checkbox_fields.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                  {form.checkbox_fields.map((field, i) => (
                    <span key={i} className="flex items-center gap-1 bg-white border rounded-full px-2 py-0.5 text-sm">
                      <Tag className="w-3 h-3 text-gray-400" />
                      {field}
                      <button type="button" onClick={() => removeField(i)}><X className="w-3 h-3 text-red-400 hover:text-red-600" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Check className="w-4 h-4 mr-1" /> Salvar Modelo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MedicalRecordsPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const loadTemplates = async () => {
    setIsLoading(true);
    const data = await base44.entities.MedicalRecordTemplate.list();
    setTemplates(data);
    setIsLoading(false);
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleSave = async (formData) => {
    if (editingTemplate) {
      await base44.entities.MedicalRecordTemplate.update(editingTemplate.id, formData);
    } else {
      await base44.entities.MedicalRecordTemplate.create(formData);
    }
    setShowForm(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  const handleEdit = (tpl) => {
    setEditingTemplate(tpl);
    setShowForm(true);
  };

  const handleDelete = async (tpl) => {
    if (!confirm(`Excluir o modelo "${tpl.name}"?`)) return;
    await base44.entities.MedicalRecordTemplate.delete(tpl.id);
    loadTemplates();
  };

  const handleToggleActive = async (tpl) => {
    await base44.entities.MedicalRecordTemplate.update(tpl.id, { active: !tpl.active });
    loadTemplates();
  };

  const filtered = activeTab === "all" ? templates : templates.filter(t => t.category === activeTab);

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Modelos de Prontuário</h1>
            <p className="text-gray-600">Crie e gerencie os modelos usados nas evoluções dos pacientes</p>
          </div>
          <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Modelo
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${activeTab === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 text-gray-600"}`}>
            Todos ({templates.length})
          </button>
          {CATEGORIES.map(c => {
            const count = templates.filter(t => t.category === c.value).length;
            if (!count) return null;
            return (
              <button key={c.value} onClick={() => setActiveTab(c.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${activeTab === c.value ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 text-gray-600"}`}>
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="w-14 h-14 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">Nenhum modelo encontrado</h3>
              <p className="text-gray-500 text-sm mb-4">Crie um modelo de prontuário para começar</p>
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Modelo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(tpl => {
              const cat = CATEGORIES.find(c => c.value === tpl.category);
              return (
                <Card key={tpl.id} className={`border-2 ${tpl.active ? "border-transparent" : "border-gray-200 opacity-60"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{tpl.name}</h3>
                          {!tpl.active && <Badge variant="secondary" className="text-xs shrink-0">Inativo</Badge>}
                        </div>
                        {cat && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>}
                        {tpl.description && <p className="text-sm text-gray-500 mt-2 truncate">{tpl.description}</p>}
                        {tpl.checkbox_fields?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tpl.checkbox_fields.slice(0, 4).map((f, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{f}</span>
                            ))}
                            {tpl.checkbox_fields.length > 4 && (
                              <span className="text-xs text-gray-400">+{tpl.checkbox_fields.length - 4} mais</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => handleToggleActive(tpl)} title={tpl.active ? "Desativar" : "Ativar"}>
                          {tpl.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => handleEdit(tpl)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDelete(tpl)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <TemplateForm
          template={editingTemplate}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
        />
      )}
    </div>
  );
}