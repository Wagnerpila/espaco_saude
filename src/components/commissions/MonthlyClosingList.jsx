import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Lock, Unlock, Plus } from "lucide-react";
import { toast } from "sonner";

export default function MonthlyClosingList({ closings, professionals, onReload }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    professional_id: ''
  });

  const handleCreateClosing = async () => {
    try {
      const { closeMonthlyCommissions } = await import("@/functions/closeMonthlyCommissions");
      await closeMonthlyCommissions({
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        professional_id: formData.professional_id || null
      });

      toast.success("Fechamento realizado com sucesso!");
      setShowCreateDialog(false);
      onReload();
    } catch (error) {
      console.error("Erro ao criar fechamento:", error);
      toast.error("Erro ao criar fechamento");
    }
  };

  const getProfessionalName = (id) => {
    if (!id) return "Todos os profissionais";
    const prof = professionals.find(p => p.id === id);
    return prof?.full_name || 'N/A';
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[month - 1];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Fechamentos Mensais
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Fechamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Fechamento Mensal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mês</Label>
                    <Select
                      value={formData.month.toString()}
                      onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {getMonthName(i + 1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Profissional (opcional)</Label>
                  <Select
                    value={formData.professional_id}
                    onValueChange={(value) => setFormData({ ...formData, professional_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os profissionais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos os profissionais</SelectItem>
                      {professionals.map(prof => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleCreateClosing} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Gerar Fechamento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {closings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum fechamento encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Atendimentos</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>Comissões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Fechamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closings.map((closing) => (
                  <TableRow key={closing.id}>
                    <TableCell className="font-medium">
                      {getMonthName(closing.month)}/{closing.year}
                    </TableCell>
                    <TableCell>{getProfessionalName(closing.professional_id)}</TableCell>
                    <TableCell>{closing.total_appointments}</TableCell>
                    <TableCell>R$ {closing.total_revenue?.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">R$ {closing.total_commission?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={closing.status === 'closed' ? 'default' : 'secondary'}
                        className={closing.status === 'closed' ? 'bg-blue-500' : 'bg-gray-500'}
                      >
                        {closing.status === 'closed' ? (
                          <><Lock className="w-3 h-3 mr-1" /> Fechado</>
                        ) : (
                          <><Unlock className="w-3 h-3 mr-1" /> Aberto</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {closing.closing_date ? new Date(closing.closing_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}