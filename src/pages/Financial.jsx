import React, { useState, useEffect } from "react";
import { FinancialRecord, Patient, Professional } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { confirmPayment } from "@/functions/confirmPayment";
import FinancialSummaryBar from "../components/financial/FinancialSummaryBar";
import FinancialTransactionTable from "../components/financial/FinancialTransactionTable";
import FinancialReportsByEntity from "../components/financial/FinancialReportsByEntity";
import FinancialMonthlyChart from "../components/financial/FinancialMonthlyChart";
import CreditAnalysis from "../components/financial/CreditAnalysis";
import InvoiceEmission from "../components/financial/InvoiceEmission";
import FinancialForm from "../components/financial/FinancialForm";

export default function FinancialPage() {
  const [transactions, setTransactions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [t, p, pr] = await Promise.all([
      FinancialRecord.list("-transaction_date"),
      Patient.list(),
      Professional.list()
    ]);
    setTransactions(t);
    setPatients(p);
    setProfessionals(pr);
    setIsLoading(false);
  };

  const handleSubmit = async (data) => {
    try {
      if (editingTransaction) {
        await FinancialRecord.update(editingTransaction.id, data);
      } else {
        await FinancialRecord.create(data);
      }
      setShowForm(false);
      setEditingTransaction(null);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error(error.response?.data?.error || "Erro ao salvar transação");
    }
  };

  const handleConfirmPayment = async (transaction) => {
    try {
      await confirmPayment({
        transactionId: transaction.id,
        paymentMethod: transaction.payment_method || "cash",
      });
      toast.success("Pagamento confirmado!");
      loadData();
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      toast.error(error.response?.data?.message || "Erro ao confirmar pagamento");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Controle completo de receitas, despesas e relatórios</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
            <Button size="sm" onClick={() => { setEditingTransaction(null); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 gap-1">
              <Plus className="w-4 h-4" /> Nova Transação
            </Button>
          </div>
        </div>

        {/* Summary Bar (Receitas / Despesas / Saldo) */}
        <FinancialSummaryBar transactions={transactions} isLoading={isLoading} />

        {/* Form Modal */}
        {showForm && (
          <FinancialForm
            transaction={editingTransaction}
            appointments={[]}
            patients={patients}
            professionals={professionals}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingTransaction(null); }}
          />
        )}

        {/* Tabs */}
        <Tabs defaultValue="transactions">
          <TabsList className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-xl shadow-sm">
            <TabsTrigger value="transactions" className="rounded-lg text-sm">Transações</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg text-sm">Relatórios</TabsTrigger>
            <TabsTrigger value="credit" className="rounded-lg text-sm">Análise de Crédito</TabsTrigger>
            <TabsTrigger value="invoice" className="rounded-lg text-sm">Emitir NFS-e</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4">
            <FinancialTransactionTable
              transactions={transactions}
              patients={patients}
              professionals={professionals}
              isLoading={isLoading}
              onEdit={(t) => { setEditingTransaction(t); setShowForm(true); }}
              onDelete={async (id) => { await FinancialRecord.delete(id); loadData(); }}
              onConfirmPayment={handleConfirmPayment}
            />
          </TabsContent>

          <TabsContent value="reports" className="mt-4 space-y-4">
            <FinancialMonthlyChart transactions={transactions} isLoading={isLoading} />
            <FinancialReportsByEntity transactions={transactions} patients={patients} professionals={professionals} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="credit" className="mt-4">
            <CreditAnalysis patients={patients} />
          </TabsContent>

          <TabsContent value="invoice" className="mt-4">
            <InvoiceEmission patients={patients} professionals={professionals} transactions={transactions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}