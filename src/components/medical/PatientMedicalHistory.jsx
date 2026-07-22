import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, FileText, ChevronDown, ChevronUp, Calendar, User, 
  ClipboardList, X, Check, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function EvolutionForm({ patient, professionals, templates, onSave, onCancel }) {
  const [form, setForm] = useState({
    professional_id: "",
    session_date: format(new Date(), "yyyy-MM-dd"),
    diagnosis: "",
    treatment: "",
    observations: "",
    next_session_notes: "",
    template_id: "",
    checked_fields: [],
  });
  const [saving, setSaving] = useState(false);
  const selectedTemplate = templates.find(t => t.id === form.template_id);

  const toggleField = (field) => {
    setForm(f => ({
      ...f,
      checked_fields: f.checked_fields.includes(field)
        ? f.checked_fields.filter(x => x !== field)
        : [...f.checked_fields, field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      patient_id: patient.id,
      professional_id: form.professional_id,
      session_date: form.session_date,
      diagnosis: form.diagnosis,
      treatment: form.treatment || form.checked_fields.join(", "),
      observations: form.observations,
      next_session_notes: form.next_session_notes,
    };
    await onSave(data);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-base font-bold text-gray-900">Nova Evolução — {patient.full_name}</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Data da Sessão *</label>
              <input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Profissional *</label>
              <select value={form.professional_id} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" required>
                <option value="">Selecionar...</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          </div>

          {templates.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Modelo de Prontuário</label>
              <select value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value, checked_fields: [] }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">Sem modelo</option>
                {templates.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {selectedTemplate?.checkbox_fields?.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Itens realizados</label>
              <div className="grid grid-cols-2 gap-1 p-3 bg-gray-50 rounded-lg">
                {selectedTemplate.checkbox_fields.map((field, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100">
                    <input type="checkbox" checked={form.checked_fields.includes(field)}
                      onChange={() => toggleField(field)} className="rounded" />
                    {field}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Diagnóstico / Avaliação</label>
            <input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
              placeholder="Diagnóstico ou avaliação da sessão"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          {!selectedTemplate?.checkbox_fields?.length && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tratamento realizado</label>
              <textarea value={form.treatment} onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))}
                rows={2} placeholder="Descreva o tratamento realizado..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Observações</label>
            <textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
              rows={2} placeholder="Observações gerais..."
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notas para próxima sessão</label>
            <input value={form.next_session_notes} onChange={e => setForm(f => ({ ...f, next_session_notes: e.target.value }))}
              placeholder="O que trabalhar na próxima sessão..."
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Salvar Evolução</>}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function EvolutionCard({ record, professionals }) {
  const [expanded, setExpanded] = useState(false);
  const professional = professionals.find(p => p.id === record.professional_id);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">
              {format(new Date(record.session_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p className="text-xs text-gray-500">{professional?.full_name || "Profissional"}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="p-3 bg-gray-50 border-t space-y-2 text-sm">
          {record.diagnosis && (
            <div>
              <span className="font-medium text-gray-700">Diagnóstico: </span>
              <span className="text-gray-600">{record.diagnosis}</span>
            </div>
          )}
          {record.treatment && (
            <div>
              <span className="font-medium text-gray-700">Tratamento: </span>
              <span className="text-gray-600">{record.treatment}</span>
            </div>
          )}
          {record.observations && (
            <div>
              <span className="font-medium text-gray-700">Observações: </span>
              <span className="text-gray-600">{record.observations}</span>
            </div>
          )}
          {record.next_session_notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <span className="font-medium text-yellow-800">Próxima sessão: </span>
              <span className="text-yellow-700">{record.next_session_notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PatientMedicalHistory({ patient }) {
  const [records, setRecords] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [recs, profs, tmpls] = await Promise.all([
      base44.entities.MedicalRecord.filter({ patient_id: patient.id }),
      base44.entities.Professional.list(),
      base44.entities.MedicalRecordTemplate.list(),
    ]);
    setRecords(recs.sort((a, b) => new Date(b.session_date) - new Date(a.session_date)));
    setProfessionals(profs);
    setTemplates(tmpls);
    setIsLoading(false);
  };

  useEffect(() => {
    if (patient) loadData();
  }, [patient?.id]);

  const handleSave = async (data) => {
    await base44.entities.MedicalRecord.create(data);
    setShowForm(false);
    loadData();
  };

  if (isLoading) return (
    <div className="flex justify-center py-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">Histórico de Evoluções</h4>
          <p className="text-xs text-gray-500">{records.length} registro(s)</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nova Evolução
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Nenhuma evolução registrada ainda.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Registrar primeira evolução
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <EvolutionCard key={r.id} record={r} professionals={professionals} />
          ))}
        </div>
      )}

      {showForm && (
        <EvolutionForm
          patient={patient}
          professionals={professionals}
          templates={templates}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}