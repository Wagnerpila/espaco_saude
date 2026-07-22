import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCheck, Save, X, CalendarX, CalendarOff, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import ScheduleBlockManager from "./ScheduleBlockManager";
import { ScheduleBlock } from "@/entities/all";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";

export default function ProfessionalForm({ professional, onSubmit, onCancel }) {
  const [showBlockManager, setShowBlockManager] = useState(false);
  const [formData, setFormData] = useState(professional || {
    full_name: "",
    specialty: "",
    crefito: "",
    phone: "",
    email: "",
    working_hours: {
      monday: { start: "08:00", end: "18:00", active: true },
      tuesday: { start: "08:00", end: "18:00", active: true },
      wednesday: { start: "08:00", end: "18:00", active: true },
      thursday: { start: "08:00", end: "18:00", active: true },
      friday: { start: "08:00", end: "17:00", active: true },
      saturday: { start: "08:00", end: "12:00", active: false },
      sunday: { start: "00:00", end: "00:00", active: false }
    },
    default_commission_percentage: 0,
    active: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day],
          [field]: value
        }
      }
    }));
  };

  const handleBlockWeek = async () => {
    if (!professional) return;
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    if (!confirm(`Bloquear agenda de ${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}?`)) return;
    try {
      await ScheduleBlock.create({
        professional_id: professional.id,
        block_type: "full_day",
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd'),
        reason: "Bloqueio rápido - semana",
        active: true
      });
      alert("Semana bloqueada com sucesso!");
    } catch (e) {
      alert("Erro ao bloquear semana");
    }
  };

  const handleBlockMonth = async () => {
    if (!professional) return;
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    if (!confirm(`Bloquear agenda do mês inteiro (${format(start, 'dd/MM')} a ${format(end, 'dd/MM')})?`)) return;
    try {
      await ScheduleBlock.create({
        professional_id: professional.id,
        block_type: "full_day",
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd'),
        reason: "Bloqueio rápido - mês",
        active: true
      });
      alert("Mês bloqueado com sucesso!");
    } catch (e) {
      alert("Erro ao bloquear mês");
    }
  };

  const dayLabels = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira", 
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" />
            {professional ? 'Editar Profissional' : 'Novo Profissional'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade *</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => handleChange('specialty', e.target.value)}
                  placeholder="Ex: Fisioterapia Ortopédica, Pilates..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crefito">CREFITO</Label>
                <Input
                  id="crefito"
                  value={formData.crefito}
                  onChange={(e) => handleChange('crefito', e.target.value)}
                  placeholder="CREFITO-3/12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Comissão Padrão (%)
                </Label>
                <div className="relative">
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.default_commission_percentage || 0}
                    onChange={(e) => handleChange('default_commission_percentage', parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 30"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
                <p className="text-xs text-gray-500">Percentual aplicado sobre o valor de cada atendimento concluído</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Horários de Trabalho</h3>
              {Object.entries(dayLabels).map(([day, label]) => (
                <div key={day} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${day}-active`}
                      checked={formData.working_hours[day]?.active || false}
                      onCheckedChange={(checked) => 
                        handleWorkingHoursChange(day, 'active', checked)
                      }
                    />
                    <Label htmlFor={`${day}-active`} className="font-medium">
                      {label}
                    </Label>
                  </div>
                  
                  {formData.working_hours[day]?.active && (
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <Input
                        type="time"
                        value={formData.working_hours[day]?.start || "08:00"}
                        onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                        className="flex-1 min-w-0"
                      />
                      <span className="text-gray-500 shrink-0">às</span>
                      <Input
                        type="time"
                        value={formData.working_hours[day]?.end || "18:00"}
                        onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                        className="flex-1 min-w-0"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <div className="flex flex-wrap gap-2">
                {professional && (
                  <>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowBlockManager(true)}
                    >
                      <CalendarX className="w-4 h-4 mr-2" />
                      Gerenciar Bloqueios
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      className="border-orange-400 text-orange-600 hover:bg-orange-50"
                      onClick={handleBlockWeek}
                    >
                      <CalendarOff className="w-4 h-4 mr-2" />
                      Bloquear Semana
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      className="border-red-400 text-red-600 hover:bg-red-50"
                      onClick={handleBlockMonth}
                    >
                      <CalendarOff className="w-4 h-4 mr-2" />
                      Bloquear Mês
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-3 w-full justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {professional ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {showBlockManager && professional && (
        <ScheduleBlockManager
          professional={professional}
          onClose={() => setShowBlockManager(false)}
        />
      )}
    </motion.div>
  );
}