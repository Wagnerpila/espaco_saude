import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Save, X } from "lucide-react";
import { motion } from "framer-motion";

export default function FinancialForm({ 
  transaction,
  appointments,
  patients, 
  professionals,
  onSubmit, 
  onCancel 
}) {
  const [formData, setFormData] = useState(transaction || {
    type: "income",
    description: "",
    amount: 0,
    payment_method: "cash",
    transaction_date: new Date().toISOString().split('T')[0],
    category: "",
    appointment_id: "",
    patient_id: "",
    professional_id: "",
    is_recurring: false,
    due_date: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const expenseCategories = [
    "Aluguel", "Equipamentos", "Material de Consumo", "Telefone/Internet",
    "Energia Elétrica", "Água", "Limpeza", "Manutenção", "Marketing",
    "Cursos/Treinamentos", "Contador", "Advogado", "Seguro", "Outros"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            {transaction ? 'Editar Transação' : 'Nova Transação'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => handleChange('transaction_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Método de Pagamento *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleChange('payment_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === "income" && (
                <>
                  <div className="space-y-2">
                    <Label>Paciente</Label>
                    <Select
                      value={formData.patient_id}
                      onValueChange={(value) => handleChange('patient_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Profissional</Label>
                    <Select
                      value={formData.professional_id}
                      onValueChange={(value) => handleChange('professional_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id}>
                            {professional.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {formData.type === "expense" && (
                <>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Vencimento</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleChange('due_date', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 md:col-span-2">
                    <Switch
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => handleChange('is_recurring', checked)}
                    />
                    <Label className="cursor-pointer">
                      Despesa recorrente fixa (repete todo mês automaticamente a partir do vencimento)
                    </Label>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Descrição da transação..."
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                {transaction ? 'Atualizar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}