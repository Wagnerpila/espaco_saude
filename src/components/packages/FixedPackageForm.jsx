import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateMonthlyAppointments } from "@/functions/generateMonthlyAppointments";

const weekDays = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" }
];

export default function FixedPackageForm({
  patient,
  professionals,
  servicePlans = [],
  rooms = [],
  onSubmit,
  onCancel
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [scheduleSessions, setScheduleSessions] = useState(false);
  const [fixedDays, setFixedDays] = useState([]);
  const [dayTimes, setDayTimes] = useState({});
  const [selectedRoom, setSelectedRoom] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(null);
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
        0, // discount percentage
        0, // discount amount
        false // is_free
      );

      setFormData({
        ...formData,
        plan_name: plan.plan_name,
        total_sessions: plan.sessions_per_cycle || 10,
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

  const handleDayToggle = (day) => {
    setFixedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleDayTimeChange = (day, time) => {
    setDayTimes(prev => ({ ...prev, [day]: time }));
  };

  const handleSubmit = async () => {
    if (!formData.plan_name || !formData.professional_id) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    // Envia só os campos que existem de fato no ServicePackage (Prisma) —
    // total_sessions/payment_type/installments são estado só de UI, não
    // colunas do banco; mandar eles direto causava erro 500 no backend.
    const packageData = {
      patient_id: patient.id,
      professional_id: formData.professional_id,
      package_type: formData.package_type,
      plan_name: formData.plan_name,
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      plan_value: Number(formData.plan_value) || 0,
      discount_percentage: Number(formData.discount_percentage) || 0,
      discount_amount: Number(formData.discount_amount) || 0,
      final_value: Number(formData.final_value) || 0,
      is_free: formData.is_free,
      limit_sessions: true,
      max_sessions: Number(formData.total_sessions) || 0,
      sessions_used: 0,
      status: "active",
      notes: formData.notes
    };

    // Sem dias fixos definidos: comportamento normal, fecha o formulário.
    // (O pai mantém o modal montado pra permitir a confirmação de geração de
    // agenda quando há dias fixos — então quando não há, fechamos aqui mesmo.)
    if (!scheduleSessions || fixedDays.length === 0) {
      await onSubmit(packageData);
      onCancel();
      return;
    }

    // Com dias fixos: cria o pacote, depois gera os agendamentos do mês na
    // agenda automaticamente, e só então mostra a confirmação.
    setIsGenerating(true);
    const newPackage = await onSubmit(packageData);

    if (newPackage?.id) {
      try {
        const result = await generateMonthlyAppointments({
          package_id: newPackage.id,
          patient_id: patient.id,
          professional_id: formData.professional_id,
          room_id: selectedRoom || null,
          fixed_days: fixedDays,
          day_times: dayTimes,
          start_date: formData.start_date,
          duration: 60,
          service_type: formData.plan_name,
          notes: formData.notes
        });
        setGeneratedCount(result?.data?.created_count ?? 0);
      } catch (err) {
        console.error("Erro ao gerar agendamentos:", err);
        setGeneratedCount(0);
      }
    }
    setIsGenerating(false);
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
                onChange={(e) => setFormData({ ...formData, total_sessions: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
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
                    onChange={(e) => setFormData({ ...formData, installments: e.target.value === '' ? '' : parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.installments || 1}x de R$ {((Number(formData.final_value) || 0) / (Number(formData.installments) || 1)).toFixed(2)}
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
              placeholder="Observações sobre o pacote..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Dias e horários fixos das sessões */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch checked={scheduleSessions} onCheckedChange={setScheduleSessions} />
              <Label className="font-semibold">Este pacote tem dias e horários fixos de sessão?</Label>
            </div>

            {scheduleSessions && (
              <div className="space-y-4 mt-3">
                <div className="space-y-3">
                  {weekDays.map((day) => {
                    const isSelected = fixedDays.includes(day.value);
                    return (
                      <div key={day.value} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isSelected ? 'bg-green-50 border border-green-200' : ''}`}>
                        <Checkbox checked={isSelected} onCheckedChange={() => handleDayToggle(day.value)} />
                        <Label className="text-sm cursor-pointer w-20">{day.label}</Label>
                        {isSelected && (
                          <Input
                            type="time"
                            value={dayTimes[day.value] || "09:00"}
                            onChange={(e) => handleDayTimeChange(day.value, e.target.value)}
                            className="w-32"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {rooms.length > 0 && (
                  <div>
                    <Label>Sala padrão (opcional)</Label>
                    <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a sala" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.room_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {fixedDays.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    O sistema irá gerar automaticamente <strong>{fixedDays.length}x por semana</strong> todos os agendamentos do mês de <strong>{format(new Date(formData.start_date), "MMMM/yyyy", { locale: ptBR })}</strong>.
                  </div>
                )}
              </div>
            )}
          </div>

          {generatedCount !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium flex items-center justify-between">
              <span>✅ {generatedCount} agendamento(s) criado(s) automaticamente na agenda!</span>
              <Button size="sm" className="ml-2 bg-green-600 hover:bg-green-700" onClick={onCancel}>
                Fechar
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isGenerating} className="flex-1 bg-green-600 hover:bg-green-700">
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando agendamentos...</> : <><Save className="w-4 h-4 mr-2" />Salvar Pacote</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
