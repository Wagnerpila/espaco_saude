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
    limit_time: false,
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
      // Monta o payload explicitamente em vez de espalhar formData inteiro:
      // `limit_time` é só um flag de UI (não existe na tabela) e
      // start_time/end_time só fazem sentido pra partial_day ou pra uma
      // recorrência semanal com horário limitado — do contrário o bloqueio
      // vale o dia todo.
      const payload = {
        professional_id: professional.id,
        block_type: blockType,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        recurring_pattern: blockType === "recurring_exception" ? formData.recurring_pattern : "none",
        recurring_days: formData.recurring_days || [],
        custom_dates: formData.custom_dates || [],
        reason: formData.reason
      };

      const hasTimeRange = blockType === "partial_day"
        || (blockType === "recurring_exception" && formData.recurring_pattern === "weekly" && formData.limit_time);

      if (hasTimeRange) {
        payload.start_time = formData.start_time;
        payload.end_time = formData.end_time;
      }

      await ScheduleBlock.create(payload);

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
        limit_time: false,
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

  // Pra recorrência, start_date/end_date só marcam quando o bloqueio passou
  // a valer (normalmente "hoje", não editável no form) — o que descreve o
  // bloqueio de fato é o padrão (dias da semana/mês ou datas específicas).
  const getRecurrenceLabel = (block) => {
    if (block.recurring_pattern === "weekly") {
      const days = (block.recurring_days || [])
        .map(d => weekDays.find(w => w.value === d)?.label)
        .filter(Boolean)
        .join(", ");
      return `Toda(o) ${days || "—"}`;
    }
    if (block.recurring_pattern === "monthly") {
      return `Dia(s) ${(block.recurring_days || []).join(", ") || "—"} de cada mês`;
    }
    if (block.recurring_pattern === "custom") {
      return (block.custom_dates || []).map(d => d.split('-').reverse().join('/')).join(", ");
    }
    return "";
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{getBlockTypeLabel(block.block_type)}</Badge>
                        {block.block_type === "recurring_exception" ? (
                          <span className="text-sm font-medium">{getRecurrenceLabel(block)}</span>
                        ) : (
                          <span className="text-sm font-medium">
                            {block.start_date ? block.start_date.split('-').reverse().join('/') : ''}
                            {block.end_date && ` - ${block.end_date.split('-').reverse().join('/')}`}
                          </span>
                        )}
                        {block.start_time && block.end_time && (
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

                      <div className="flex items-center gap-2 mt-4">
                        <Checkbox
                          checked={formData.limit_time}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              limit_time: checked,
                              start_time: checked ? (formData.start_time || "08:00") : "",
                              end_time: checked ? (formData.end_time || "18:00") : ""
                            })
                          }
                        />
                        <Label className="text-sm">Bloquear apenas um horário específico (senão bloqueia o dia todo)</Label>
                      </div>

                      {formData.limit_time && (
                        <div className="grid md:grid-cols-2 gap-4 mt-2">
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
                      )}
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