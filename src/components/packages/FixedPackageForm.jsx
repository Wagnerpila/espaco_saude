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

export default function FixedPackageForm({ 
  patient, 
  professionals,
  servicePlans = [],
  onSubmit, 
  onCancel 
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    package_type: "fixed",
    plan_name: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: "",
    total_sessions: 10,
    plan_value: 0,
    discount_percentage: 0,
    discount_amount: 0,
    final_value: 0,
    is_free: false,
    payment_type: "full", // full, installments
    installments: 1,
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
      const planValue = field === 'plan_value' ? value : formData.plan_value;
      const discPerc = field === 'discount_percentage' ? value : formData.discount_percentage;
      const discAmount = field === 'discount_amount' ? value : formData.discount_amount;
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
      
      // Calcular desconto máximo se houver
      const maxDiscount = plan.allow_discount && plan.max_discount_percentage 
        ? plan.max_discount_percentage 
        : 0;
      
      const finalValue = calculateFinalValue(
        plan.default_value || 0,
        0, // discount percentage
        0, // discount amount
        false // is_free
      );
      
      setFormData({
        ...formData,
        plan_name: plan.plan_name,
        total_sessions: plan.sessions_per_cycle || 10,
        plan_value: plan.default_value || 0,
        professional_id: plan.available_professionals?.[0] || "",
        notes: plan.notes || "",
        discount_percentage: 0,
        discount_amount: 0,
        final_value: finalValue
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.plan_name || !formData.professional_id) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    // Envia só os campos que existem de fato no ServicePackage (Prisma) —
    // total_sessions/payment_type/installments são estado só de UI, não
    // colunas do banco; mandar eles direto causava erro 500 no backend.
    onSubmit({
      patient_id: patient.id,
      professional_id: formData.professional_id,
      package_type: formData.package_type,
      plan_name: formData.plan_name,
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      plan_value: formData.plan_value,
      discount_percentage: formData.discount_percentage,
      discount_amount: formData.discount_amount,
      final_value: formData.final_value,
      is_free: formData.is_free,
      limit_sessions: true,
      max_sessions: formData.total_sessions,
      sessions_used: 0,
      status: "active",
      notes: formData.notes
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Novo Pacote Fixo</CardTitle>
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

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do Pacote *</Label>
              <Input
                placeholder="Ex: Pacote 10 sessões Fisioterapia"
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Total de Sessões *</Label>
              <Input
                type="number"
                value={formData.total_sessions}
                onChange={(e) => setFormData({ ...formData, total_sessions: parseInt(e.target.value) || 0 })}
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
              <Label>Data de Término</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Valor do Pacote</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="0,00"
                value={formData.plan_value}
                onChange={(e) => handleValueChange('plan_value', parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => handleValueChange('discount_percentage', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Desconto (R$)</Label>
                  <Input
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) => handleValueChange('discount_amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="text-lg font-bold text-blue-900">
                  Valor Final: R$ {formData.final_value.toFixed(2)}
                </Label>
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">À Vista</SelectItem>
                    <SelectItem value="installments">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_type === 'installments' && (
                <div>
                  <Label>Número de Parcelas</Label>
                  <Input
                    type="number"
                    min="2"
                    max="12"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.installments}x de R$ {(formData.final_value / formData.installments).toFixed(2)}
                  </p>
                </div>
              )}
            </>
          )}

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
            <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Pacote
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}