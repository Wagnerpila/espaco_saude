import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpCircle, ArrowDownCircle, Edit, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function TransactionList({ 
  transactions,
  patients,
  professionals,
  isLoading,
  onEdit 
}) {
  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || '-';
  };

  const getProfessionalName = (professionalId) => {
    const professional = professionals.find(p => p.id === professionalId);
    return professional?.full_name || '-';
  };

  const paymentMethodLabels = {
    cash: "Dinheiro",
    card: "Cartão",
    pix: "PIX",
    bank_transfer: "Transferência"
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-green-500" />
          Transações Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {transaction.type === 'income' ? (
                        <ArrowUpCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge 
                        variant={transaction.type === 'income' ? "default" : "destructive"}
                      >
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      {transaction.patient_id && (
                        <p className="text-sm text-gray-500">
                          {getPatientName(transaction.patient_id)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      R$ {transaction.amount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {paymentMethodLabels[transaction.payment_method]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(transaction)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}