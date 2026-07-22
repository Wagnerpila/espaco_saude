import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Trash2, X, CalendarOff, CalendarX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScheduleBlock } from "@/entities/all";

const weekDays = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" }
];

export default function ScheduleBlockManager({ professional, onClose }) {
  const [blockType, setBlockType] = useState("full_day");
  const [blocks, setBlocks] = useState([]);
  const [formData, setFormData] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: "",
    start_time: "08:00",
    end_time: "18:00",
    recurring_pattern: "none",
    recurring_days: [],
    custom_dates: [],
    reason: ""
  });

  useEffect(() => {
    loadBlocks();
  }, [professional]);

  const loadBlocks = async () => {
    try {
      const professionalBlocks = await ScheduleBlock.filter({ 
        professional_id: professional.id,
        active: true 
      });
      setBlocks(professionalBlocks);
    } catch (error) {
      console.error("Erro ao carregar bloqueios:", error);
    }
  };

  const handleDayToggle = (day) => {
    const current = formData.recurring_days || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setFormData({ ...formData, recurring_days: updated });
  };

  const handleAddCustomDate = () => {
    const newDate = prompt("Digite a data (DD/MM/YYYY):");
    if (newDate) {
      try {
        const [day, month, year] = newDate.split('/');
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        setFormData({
          ...formData,
          custom_dates: [...(formData.custom_dates || []), dateStr]
        });
      } catch (error) {
        alert("Data inválida");
      }
    }
  };

  const handleRemoveCustomDate = (index) => {
    const updated = formData.custom_dates.filter((_, i) => i !== index);
    setFormData({ ...formData, custom_dates: updated });
  };

  const handleSubmit = async () => {
    try {
      await ScheduleBlock.create({
        professional_id: professional.id,
        block_type: blockType,
        ...formData
      });
      
      alert("Bloqueio criado com sucesso!");
      loadBlocks();
      
      // Reset form
      setFormData({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: "",
        start_time: "08:00",
        end_time: "18:00",
        recurring_pattern: "none",
        recurring_days: [],
        custom_dates: [],
        reason: ""
      });
    } catch (error) {
      console.error("Erro ao criar bloqueio:", error);
      alert("Erro ao criar bloqueio");
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!confirm("Deseja realmente remover este bloqueio?")) return;
    
    try {
      await ScheduleBlock.delete(blockId);
      loadBlocks();
    } catch (error) {
      console.error("Erro ao remover bloqueio:", error);
    }
  };

  const getBlockTypeLabel = (type) => {
    const labels = {
      full_day: "Dia Completo",
      partial_day: "Período Parcial",
      recurring_exception: "Exceção Recorrente"
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarX className="w-5 h-5" />
              Gerenciar Bloqueios de Agenda - {professional.full_name}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Bloqueios Ativos */}
          {blocks.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Bloqueios Ativos</h3>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div key={block.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getBlockTypeLabel(block.block_type)}</Badge>
                        <span className="text-sm font-medium">
                          {block.start_date ? block.start_date.split('-').reverse().join('/') : ''}
                          {block.end_date && ` - ${block.end_date.split('-').reverse().join('/')}`}
                        </span>
                        {block.start_time && (
                          <span className="text-sm text-gray-600">
                            {block.start_time} - {block.end_time}
                          </span>
                        )}
                      </div>
                      {block.reason && (
                        <p className="text-xs text-gray-500 mt-1">{block.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novo Bloqueio */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Novo Bloqueio</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Tipo de Bloqueio</Label>
                <Select value={blockType} onValueChange={setBlockType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_day">
                      <div className="flex items-center gap-2">
                        <CalendarOff className="w-4 h-4" />
                        Bloquear Dia Completo
                      </div>
                    </SelectItem>
                    <SelectItem value="partial_day">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Bloquear Período Parcial
                      </div>
                    </SelectItem>
                    <SelectItem value="recurring_exception">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Agenda Variável (datas específicas)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {blockType === "full_day" && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Início</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Data de Término (opcional)</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {blockType === "partial_day" && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Data de Término (opcional)</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Hora de Início</Label>
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Hora de Término</Label>
                      <Input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {blockType === "recurring_exception" && (
                <>
                  <div>
                    <Label>Padrão de Recorrência</Label>
                    <Select 
                      value={formData.recurring_pattern} 
                      onValueChange={(value) => setFormData({ ...formData, recurring_pattern: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal (dias específicos)</SelectItem>
                        <SelectItem value="custom">Datas Personalizadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.recurring_pattern === "weekly" && (
                    <div>
                      <Label>Dias da Semana</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        {weekDays.map((day) => (
                          <div key={day.value} className="flex items-center gap-2">
                            <Checkbox
                              checked={formData.recurring_days?.includes(day.value)}
                              onCheckedChange={() => handleDayToggle(day.value)}
                            />
                            <Label className="text-sm">{day.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.recurring_pattern === "monthly" && (
                    <div>
                      <Label>Dias do Mês (ex: 1, 15, 20)</Label>
                      <Input
                        placeholder="Digite os dias separados por vírgula"
                        onChange={(e) => {
                          const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                          setFormData({ ...formData, recurring_days: days });
                        }}
                      />
                    </div>
                  )}

                  {formData.recurring_pattern === "custom" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Datas Específicas</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddCustomDate}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Data
                        </Button>
                      </div>
                      {formData.custom_dates?.length > 0 && (
                        <div className="space-y-2">
                          {formData.custom_dates.map((date, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{date ? date.split('-').reverse().join('/') : ''}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveCustomDate(index)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div>
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Ex: Férias, Curso, Evento..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Criar Bloqueio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}