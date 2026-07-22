import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Plus, Trash } from "lucide-react";
import { format } from "date-fns";

export default function PersonalizedPackageForm({ 
  patient, 
  professionals,
  servicePlans = [],
  onSubmit, 
  onCancel 
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    package_type: "personalized",
    plan_name: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    sessions: [
      { service_type: "", quantity: 1, unit_price: 0 }
    ],
    discount_percentage: 0,
    discount_amount: 0,
    final_value: 0,
    is_free: false,
    professional_id: "",
    notes: ""
  });

  const calculateTotal = () => {
    const subtotal = formData.sessions.reduce((sum, session) => {
      return sum + ((Number(session.quantity) || 0) * (Number(session.unit_price) || 0));
    }, 0);

    const discPerc = Number(formData.discount_percentage) || 0;
    const discAmount = Number(formData.discount_amount) || 0;
    let final = subtotal;
    if (discPerc > 0) {
      final = subtotal - (subtotal * discPerc / 100);
    }
    if (discAmount > 0) {
      final = final - discAmount;
    }

    return formData.is_free ? 0 : Math.max(0, final);
  };

  const addSession = () => {
    setFormData({
      ...formData,
      sessions: [...formData.sessions, { service_type: "", quantity: 1, unit_price: 0 }]
    });
  };

  const removeSession = (index) => {
    const newSessions = formData.sessions.filter((_, i) => i !== index);
    setFormData({ ...formData, sessions: newSessions });
  };

  const updateSession = (index, field, value) => {
    const newSessions = [...formData.sessions];
    newSessions[index][field] = value;
    setFormData({ ...formData, sessions: newSessions });
  };

  const handlePlanSelect = (planId) => {
    const plan = servicePlans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setFormData({
        ...formData,
        plan_name: plan.plan_name,
        professional_id: plan.available_professionals?.[0] || "",
        notes: plan.notes || "",
        sessions: [
          { service_type: plan.plan_name, quantity: plan.sessions_per_cycle || 1, unit_price: plan.default_value || 0 }
        ]
      });
    }
  };

  const handleSubmit = () => {
    const total = calculateTotal();
    const totalSessions = formData.sessions.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    // ServicePackage não tem uma coluna pra guardar a lista detalhada de
    // sessões — resume ela em texto dentro de notes pra não perder a
    // informação (a lista em si não pode ir pro backend, causa erro 500).
    const sessionsSummary = formData.sessions
      .filter((s) => s.service_type)
      .map((s) => `${Number(s.quantity) || 0}x ${s.service_type} (R$ ${(Number(s.unit_price) || 0).toFixed(2)} cada)`)
      .join('; ');

    onSubmit({
      patient_id: patient.id,
      professional_id: formData.professional_id,
      package_type: formData.package_type,
      plan_name: formData.plan_name,
      start_date: formData.start_date,
      plan_value: total,
      discount_percentage: Number(formData.discount_percentage) || 0,
      discount_amount: Number(formData.discount_amount) || 0,
      final_value: total,
      is_free: formData.is_free,
      limit_sessions: true,
      max_sessions: totalSessions,
      sessions_used: 0,
      status: "active",
      notes: [sessionsSummary, formData.notes].filter(Boolean).join(' — ')
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Novo Pacote Personalizado</CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {servicePlans.length > 0 && (
            <div>
              <Label>Selecionar Plano Pré-cadastrado</Label>
              <Select
                value={selectedPlan?.id}
                onValueChange={handlePlanSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um plano ou preencha manualmente" />
                </SelectTrigger>
                <SelectContent>
                  {servicePlans
                    .filter(plan => plan.active)
                    .map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.plan_name} - {plan.sessions_per_cycle || 0} sessões - R$ {plan.default_value?.toFixed(2) || '0.00'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Nome do Pacote *</Label>
            <Input
              placeholder="Ex: Pacote Estética Completo"
              value={formData.plan_name}
              onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
            />
          </div>

          <div>
            <Label>Data de Início *</Label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Sessões do Pacote</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSession}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.sessions.map((session, index) => (
                <Card key={index} className="bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Tipo de Serviço</Label>
                        <Input
                          placeholder="Ex: Drenagem Linfática"
                          value={session.service_type}
                          onChange={(e) => updateSession(index, 'service_type', e.target.value)}
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={session.quantity}
                          onChange={(e) => updateSession(index, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="w-28">
                        <Label className="text-xs">Valor Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={session.unit_price}
                          onChange={(e) => updateSession(index, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      {formData.sessions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSession(index)}
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Subtotal: R$ {((Number(session.quantity) || 0) * (Number(session.unit_price) || 0)).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_free}
              onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })}
            />
            <Label className="text-sm">Pacote Gratuito</Label>
          </div>

          {!formData.is_free && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>% Desconto</Label>
                <Input
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Desconto (R$)</Label>
                <Input
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Label className="text-lg font-bold text-blue-900">
              Valor Total: R$ {calculateTotal().toFixed(2)}
            </Label>
          </div>

          <div>
            <Label>Profissional Responsável *</Label>
            <Select
              value={formData.professional_id}
              onValueChange={(value) => setFormData({ ...formData, professional_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações sobre o pacote..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-orange-600 hover:bg-orange-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Pacote
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}