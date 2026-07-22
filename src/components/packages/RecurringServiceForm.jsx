import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ArrowLeft, Info, Loader2, Calendar } from "lucide-react";
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

export default function RecurringServiceForm({ 
  patient, 
  professionals,
  servicePlans = [],
  rooms = [],
  onSubmit, 
  onCancel 
}) {
  const [step, setStep] = useState(1);
  const [scheduleType, setScheduleType] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [dayTimes, setDayTimes] = useState({}); // { monday: "09:00", wednesday: "10:00" }
  const [selectedRoom, setSelectedRoom] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(null);
  const [formData, setFormData] = useState({
    package_type: "recurring",
    plan_name: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    schedule_type: "",
    fixed_days: [],
    sessions_per_cycle: 0,
    cycle_type: "monthly",
    limit_sessions: false,
    max_sessions: null,
    allow_absence_justification: false,
    plan_value: 0,
    discount_percentage: 0,
    discount_amount: 0,
    final_value: 0,
    is_free: false,
    freeze_value: false,
    auto_billing: false,
    professional_id: "",
    notes: ""
  });

  const handleScheduleTypeSelect = (type) => {
    setScheduleType(type);
    setFormData({ ...formData, schedule_type: type });
    setStep(2);
  };

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

  const handleDayToggle = (day) => {
    const current = formData.fixed_days || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setFormData({ ...formData, fixed_days: updated });
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
        sessions_per_cycle: plan.sessions_per_cycle || 0,
        plan_value: plan.default_value || 0,
        professional_id: plan.available_professionals?.[0] || "",
        notes: plan.notes || "",
        discount_percentage: 0,
        discount_amount: 0,
        final_value: finalValue
      });
    }
  };

  const handleDayTimeChange = (day, time) => {
    setDayTimes(prev => ({ ...prev, [day]: time }));
  };

  const handleSubmit = async () => {
    if (!formData.plan_name || !formData.professional_id) {
      alert("Preencha todos os campos obrigatórios (nome do plano e responsável pela venda).");
      return;
    }

    const packageData = {
      ...formData,
      patient_id: patient.id
    };

    // Se não tem dias fixos, submete e fecha normalmente
    if (formData.schedule_type !== 'fixed' || !formData.fixed_days?.length) {
      await onSubmit(packageData);
      onCancel();
      return;
    }

    // Com dias fixos: cria pacote, depois gera agendamentos, depois mostra confirmação
    setIsGenerating(true);
    const newPackage = await onSubmit(packageData);

    if (newPackage?.id) {
      try {
        const result = await generateMonthlyAppointments({
          package_id: newPackage.id,
          patient_id: patient.id,
          professional_id: formData.professional_id,
          room_id: selectedRoom || null,
          fixed_days: formData.fixed_days,
          day_times: dayTimes,
          start_date: formData.start_date,
          duration: 60,
          service_type: formData.plan_name,
          notes: formData.notes
        });
        setGeneratedCount(result?.data?.created_count || 0);
      } catch (err) {
        console.error("Erro ao gerar agendamentos:", err);
        setGeneratedCount(0);
      }
    }
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">{step}/3</span>
              <span className="text-lg">Novo serviço recorrente</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Como será o agendamento?</h3>
              
              <Card 
                className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-purple-400 bg-purple-50"
                onClick={() => handleScheduleTypeSelect('fixed')}
              >
                <CardContent className="p-4">
                  <h4 className="font-semibold text-purple-900 mb-1">Dias Fixos</h4>
                  <p className="text-sm text-gray-700">
                    Meu cliente possui dias fixos de atendimento/aula.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-purple-400"
                onClick={() => handleScheduleTypeSelect('flexible')}
              >
                <CardContent className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Dias Flexíveis</h4>
                  <p className="text-sm text-gray-600">
                    Meu cliente NÃO possui dias fixos programados.
                  </p>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Os próximos ciclos iniciam sempre no mesmo dia de cada mês
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
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
                <Label>Selecione o plano</Label>
                <Input
                  placeholder="Ex: Pilates 2x semana"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Valor do plano</Label>
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
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>% Desconto</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={formData.discount_percentage}
                          onChange={(e) => handleValueChange('discount_percentage', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="mt-6"
                      onClick={() => {
                        const calc = formData.plan_value - formData.final_value;
                        handleValueChange('discount_amount', calc);
                      }}
                    >
                      Calcular Desconto
                    </Button>
                  </div>

                  <div>
                    <Label>Valor final: R$ {formData.final_value.toFixed(2)}</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.freeze_value}
                      onCheckedChange={(checked) => setFormData({ ...formData, freeze_value: checked })}
                    />
                    <Label className="text-sm">Congelar o valor até o final do plano</Label>
                  </div>

                  {formData.freeze_value && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                      <p className="font-semibold text-orange-900">
                        Para manter o valor "congelado" você deve informar uma data para encerramento.
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Início do Serviço: {format(new Date(formData.start_date), "dd/MM/yyyy")}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.auto_billing}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_billing: checked })}
                />
                <Label className="text-sm">Agendar encerramento do serviço</Label>
              </div>

              <div>
                <Label>Responsável pela venda *</Label>
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

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Quantidade de reposições permitidas por ciclo mensal</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={formData.limit_sessions}
                    onCheckedChange={(checked) => setFormData({ ...formData, limit_sessions: checked })}
                  />
                  <span className="text-sm">Limitar reposições</span>
                </div>
                {formData.limit_sessions && (
                  <Input
                    type="number"
                    placeholder="Informe o número"
                    value={formData.max_sessions || ""}
                    onChange={(e) => setFormData({ ...formData, max_sessions: parseInt(e.target.value) || null })}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.allow_absence_justification}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_absence_justification: checked })}
                />
                <Label className="text-sm flex items-center gap-1">
                  Permitir cliente justificar ausência pelo seufisio check-in
                  <Info className="w-4 h-4 text-gray-400" />
                </Label>
              </div>

              {formData.schedule_type === 'fixed' && (
                <div className="space-y-4">
                  <Label className="font-semibold">Selecione os dias e horários das aulas</Label>
                  <div className="space-y-3">
                    {weekDays.map((day) => {
                      const isSelected = formData.fixed_days?.includes(day.value);
                      return (
                        <div key={day.value} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isSelected ? 'bg-purple-50 border border-purple-200' : ''}`}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleDayToggle(day.value)}
                          />
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
                          <SelectItem value={null}>Sem sala definida</SelectItem>
                          {rooms.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.room_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.fixed_days?.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      O sistema irá gerar automaticamente <strong>{formData.fixed_days.length}x por semana</strong> todos os agendamentos do mês de <strong>{format(new Date(formData.start_date), "MMMM/yyyy", { locale: ptBR })}</strong>.
                    </div>
                  )}
                </div>
              )}

              {generatedCount !== null && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium flex items-center justify-between">
                  <span>✅ {generatedCount} agendamento(s) criado(s) automaticamente na agenda!</span>
                  <Button size="sm" className="ml-2 bg-green-600 hover:bg-green-700" onClick={onCancel}>
                    Fechar
                  </Button>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={isGenerating} className="flex-1 bg-green-600 hover:bg-green-700">
                  {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando agendamentos...</> : "Salvar e Concluir"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}