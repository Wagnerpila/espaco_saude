import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function CommissionReportTable({ commissions, professionals, patients }) {
  const getProfessionalName = (id) => {
    const prof = professionals.find(p => p.id === id);
    return prof?.full_name || 'N/A';
  };

  const getPatientName = (id) => {
    const patient = patients.find(p => p.id === id);
    return patient?.full_name || 'N/A';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório Detalhado de Comissões</CardTitle>
      </CardHeader>
      <CardContent>
        {commissions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhuma comissão encontrada com os filtros aplicados</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Valor Serviço</TableHead>
                  <TableHead>% Comissão</TableHead>
                  <TableHead>Valor Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>{format(new Date(commission.service_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{getProfessionalName(commission.professional_id)}</TableCell>
                    <TableCell>{getPatientName(commission.patient_id)}</TableCell>
                    <TableCell>{commission.service_name}</TableCell>
                    <TableCell>R$ {commission.service_value?.toFixed(2)}</TableCell>
                    <TableCell>{commission.commission_percentage}%</TableCell>
                    <TableCell className="font-bold">R$ {commission.commission_value?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={commission.payment_status === 'paid' ? 'default' : 'secondary'}
                        className={commission.payment_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}
                      >
                        {commission.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
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