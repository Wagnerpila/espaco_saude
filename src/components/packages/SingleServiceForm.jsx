import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { X, Save } from "lucide-react";
import { format } from "date-fns";

export default function SingleServiceForm({ 
  patient, 
  professionals,
  servicePlans = [],
  onSubmit, 
  onCancel 
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    package_type: "single",
    plan_name: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    service_type: "",
    plan_value: 0,
    discount_percentage: 0,
    discount_amount: 0,
    final_value: 0,
    is_free: false,
    payment_method: "pending",
    professional_id: "",
    notes: ""
  });

  const calculateFinalValue = (value, discountPerc, discountAmount, isFree) => {
    if (isFree) return 0;
    let final = value;
    if (discountPerc > 0) {
      final = value - (value * discountPerc / 100);
    }
    if (discountAmount > 0) {
      final = final - discountAmount;
    }
    return Math.max(0, final);
  };

  const handleValueChange = (field, value) => {
    const updates = { [field]: value };
    
    if (field === 'plan_value' || field === 'discount_percentage' || field === 'discount_amount' || field === 'is_free') {
      const planValue = Number(field === 'plan_value' ? value : formData.plan_value) || 0;
      const discPerc = Number(field === 'discount_percentage' ? value : formData.discount_percentage) || 0;
      const discAmount = Number(field === 'discount_amount' ? value : formData.discount_amount) || 0;
      const isFree = field === 'is_free' ? value : formData.is_free;
      
      updates.final_value = calculateFinalValue(planValue, discPerc, discAmount, isFree);
      
      if (field === 'is_free' && value) {
        updates.plan_value = 0;
        updates.discount_percentage = 0;
        updates.discount_amount = 0;
        updates.final_value = 0;
      }
    }
    
    setFormData({ ...formData, ...updates });
  };

  const handlePlanSelect = (planId) => {
    const plan = servicePlans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);

      const finalValue = calculateFinalValue(
        plan.default_value || 0,
        0,
        0,
        false
      );

      setFormData({
        ...formData,
        plan_name: plan.plan_name,
        service_type: plan.plan_name,
        plan_value: plan.default_value || 0,
        // Se o plano já tem profissional(is) designado(s), preenche e trava
        // (ver Select abaixo) — evita cadastrar a cobrança no nome errado.
        professional_id: plan.available_professionals?.[0] || formData.professional_id,
        notes: plan.notes || "",
        discount_percentage: 0,
        discount_amount: 0,
        final_value: finalValue
      });
    }
  };

  const professionalLocked = selectedPlan?.available_professionals?.length > 0;

  const handleSubmit = () => {
    if (!formData.plan_name || !formData.professional_id) {
      alert("Preencha o nome do serviço e selecione o profissional responsável.");
      return;
    }
    // service_type/payment_method não são colunas do ServicePackage — o tipo
    // de serviço vai resumido em notes; payment_method não é usado aqui (a
    // fatura automática em PatientDetails.jsx já fixa "pending").
    onSubmit({
      patient_id: patient.id,
      professional_id: formData.professional_id,
      package_type: formData.package_type,
      plan_name: formData.plan_name,
      start_date: formData.start_date,
      plan_value: Number(formData.plan_value) || 0,
      discount_percentage: Number(formData.discount_percentage) || 0,
      discount_amount: Number(formData.discount_amount) || 0,
      final_value: Number(formData.final_value) || 0,
      is_free: formData.is_free,
      limit_sessions: true,
      sessions_per_cycle: 1,
      max_sessions: 1,
      sessions_used: 0,
      status: "active",
      notes: [formData.service_type, formData.notes].filter(Boolean).join(' — ')
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Novo Atendimento Avulso</CardTitle>
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
                        {plan.plan_name} - R$ {plan.default_value?.toFixed(2) || '0.00'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do Serviço *</Label>
              <Input
                placeholder="Ex: Consulta Inicial"
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Data do Atendimento *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Tipo de Serviço</Label>
            <Input
              placeholder="Ex: Avaliação Fisioterapêutica, Massagem Relaxante..."
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
            />
          </div>

          <div>
            <Label>Valor do Atendimento</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="0,00"
                value={formData.plan_value}
                onChange={(e) => handleValueChange('plan_value', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                disabled={formData.is_free}
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_free}
                  onCheckedChange={(checked) => handleValueChange('is_free', checked)}
                />
                <span className="text-sm">Gratuito</span>
              </div>
            </div>
          </div>

          {!formData.is_free && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>% Desconto</Label>
                  <Input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => handleValueChange('discount_percentage', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Desconto (R$)</Label>
                  <Input
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) => handleValueChange('discount_amount', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="text-lg font-bold text-blue-900">
                  Valor Final: R$ {(Number(formData.final_value) || 0).toFixed(2)}
                </Label>
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">A Definir</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label>Profissional Responsável *</Label>
            <Select
              value={formData.professional_id}
              onValueChange={(value) => setFormData({ ...formData, professional_id: value })}
              disabled={professionalLocked}
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
            {professionalLocked && (
              <p className="text-xs text-purple-600 mt-1">
                Definido pelo plano "{selectedPlan.plan_name}" — não pode ser alterado aqui.
              </p>
            )}
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações sobre o atendimento..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-cyan-600 hover:bg-cyan-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Atendimento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}