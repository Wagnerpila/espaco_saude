import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function PaymentControlTable({ commissions, professionals, patients, onPaymentUpdate, onReload }) {
  const [selectedCommissions, setSelectedCommissions] = useState([]);

  const getProfessionalName = (id) => {
    const prof = professionals.find(p => p.id === id);
    return prof?.full_name || 'N/A';
  };

  const getPatientName = (id) => {
    const patient = patients.find(p => p.id === id);
    return patient?.full_name || 'N/A';
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCommissions(commissions.map(c => c.id));
    } else {
      setSelectedCommissions([]);
    }
  };

  const handleSelectCommission = (commissionId, checked) => {
    if (checked) {
      setSelectedCommissions([...selectedCommissions, commissionId]);
    } else {
      setSelectedCommissions(selectedCommissions.filter(id => id !== commissionId));
    }
  };

  const handleMarkAsPaid = async () => {
    if (selectedCommissions.length === 0) return;
    await onPaymentUpdate(selectedCommissions, 'paid');
    setSelectedCommissions([]);
  };

  const totalSelected = commissions
    .filter(c => selectedCommissions.includes(c.id))
    .reduce((sum, c) => sum + (c.commission_value || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Controle de Pagamentos - Comissões Pendentes
          </CardTitle>
          {selectedCommissions.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedCommissions.length} selecionada(s) - Total: R$ {totalSelected.toFixed(2)}
              </span>
              <Button 
                onClick={handleMarkAsPaid}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como Pago
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {commissions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium text-gray-900">Todas as comissões estão pagas!</p>
            <p className="text-gray-600">Não há pagamentos pendentes no momento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCommissions.length === commissions.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Valor Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCommissions.includes(commission.id)}
                        onCheckedChange={(checked) => handleSelectCommission(commission.id, checked)}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(commission.service_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{getProfessionalName(commission.professional_id)}</TableCell>
                    <TableCell>{getPatientName(commission.patient_id)}</TableCell>
                    <TableCell>{commission.service_name}</TableCell>
                    <TableCell className="font-bold text-green-600">
                      R$ {commission.commission_value?.toFixed(2)}
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