import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ClipboardList, Save, Loader2, Check } from "lucide-react";
import { MedicalRecord, Equipment, ExerciseItem } from "@/entities/all";

// Permite inserir/editar o prontuário (diagnóstico, tratamento, aparelhos e
// exercícios) direto na edição do agendamento — sem isso, corrigir uma
// consulta já finalizada de uma data anterior (ex.: esqueceram de marcar o
// aparelho usado) exigia ir até a ficha do paciente e adivinhar qual
// evolução correspondia a qual sessão. Vinculando por appointment_id, edita
// exatamente o registro daquela consulta.
export default function AppointmentMedicalRecordSection({ appointment }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [form, setForm] = useState({
    diagnosis: "",
    treatment: "",
    observations: "",
    equipment_ids: [],
    exercise_ids: [],
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSaved(false);
    Promise.all([
      Equipment.filter({ active: true }),
      ExerciseItem.filter({ active: true }),
      MedicalRecord.filter({ appointment_id: appointment.id }),
    ]).then(([equips, exs, records]) => {
      if (cancelled) return;
      setEquipments(equips);
      setExercises(exs);
      const existing = records?.[0] || null;
      setRecordId(existing?.id || null);
      setForm({
        diagnosis: existing?.diagnosis || "",
        treatment: existing?.treatment || "",
        observations: existing?.observations || "",
        equipment_ids: existing?.equipment_ids || [],
        exercise_ids: existing?.exercise_ids || [],
      });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [appointment.id]);

  const toggleEquipment = (id) => {
    setSaved(false);
    setForm(f => ({
      ...f,
      equipment_ids: f.equipment_ids.includes(id) ? f.equipment_ids.filter(x => x !== id) : [...f.equipment_ids, id]
    }));
  };

  const toggleExercise = (id) => {
    setSaved(false);
    setForm(f => ({
      ...f,
      exercise_ids: f.exercise_ids.includes(id) ? f.exercise_ids.filter(x => x !== id) : [...f.exercise_ids, id]
    }));
  };

  const handleChange = (field, value) => {
    setSaved(false);
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        diagnosis: form.diagnosis,
        treatment: form.treatment,
        observations: form.observations,
        equipment_ids: form.equipment_ids,
        exercise_ids: form.exercise_ids,
      };
      if (recordId) {
        await MedicalRecord.update(recordId, payload);
      } else {
        const created = await MedicalRecord.create({
          ...payload,
          patient_id: appointment.patient_id,
          professional_id: appointment.professional_id,
          appointment_id: appointment.id,
          session_date: appointment.appointment_date,
          next_session_notes: "",
          attachments: [],
        });
        setRecordId(created.id);
      }
      setSaved(true);
    } catch (e) {
      console.error("Erro ao salvar prontuário da consulta:", e);
      alert("Erro ao salvar o prontuário desta consulta.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-800">
          {recordId ? "Editar Prontuário desta Consulta" : "Inserir Prontuário desta Consulta"}
        </h3>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Diagnóstico / Avaliação</Label>
        <Input value={form.diagnosis} onChange={(e) => handleChange('diagnosis', e.target.value)} placeholder="Diagnóstico ou avaliação da sessão" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Tratamento realizado</Label>
        <Textarea rows={2} value={form.treatment} onChange={(e) => handleChange('treatment', e.target.value)} placeholder="Descreva o tratamento realizado..." />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Observações</Label>
        <Textarea rows={2} value={form.observations} onChange={(e) => handleChange('observations', e.target.value)} placeholder="Observações gerais..." />
      </div>

      {equipments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Aparelhos utilizados</Label>
          <div className="grid grid-cols-2 gap-1 p-3 bg-white rounded-lg border max-h-32 overflow-y-auto">
            {equipments.map(eq => (
              <label key={eq.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100">
                <input type="checkbox" checked={form.equipment_ids.includes(eq.id)} onChange={() => toggleEquipment(eq.id)} className="rounded" />
                {eq.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {exercises.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Exercícios realizados</Label>
          <div className="grid grid-cols-2 gap-1 p-3 bg-white rounded-lg border max-h-32 overflow-y-auto">
            {exercises.map(ex => (
              <label key={ex.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100">
                <input type="checkbox" checked={form.exercise_ids.includes(ex.id)} onChange={() => toggleExercise(ex.id)} className="rounded" />
                {ex.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end items-center gap-2 pt-1">
        {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Salvo</span>}
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          {recordId ? "Atualizar Prontuário" : "Salvar Prontuário"}
        </Button>
      </div>
    </div>
  );
}
