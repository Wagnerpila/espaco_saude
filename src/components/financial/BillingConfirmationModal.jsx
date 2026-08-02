import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Send, CheckCircle2, Banknote, Smartphone, CreditCard, Building2 } from "lucide-react";
import { toast } from "sonner";
import { confirmBillingReminder } from "@/functions/billingConfirmations";
import { confirmPayment } from "@/functions/confirmPayment";

const PAYMENT_METHODS = [
  { key: "pix", label: "PIX", icon: Smartphone },
  { key: "cash", label: "Dinheiro", icon: Banknote },
  { key: "card", label: "Cartão", icon: CreditCard },
  { key: "bank_transfer", label: "Transferência", icon: Building2 },
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Pop-up de confirmação antes de qualquer cobrança vencida ser enviada por
// WhatsApp — o admin precisa dizer, item a item, que o pagamento realmente
// não caiu (ou marcar como pago direto aqui, se foi uma baixa manual
// esquecida) antes de liberar o envio. Ver server/src/services/billingConfirmation.js.
export default function BillingConfirmationModal({ items, onClose, onResolved }) {
  const [busyId, setBusyId] = useState(null);
  const [markingPaidId, setMarkingPaidId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");

  const handleConfirmSend = async (item) => {
    setBusyId(item.id);
    try {
      await confirmBillingReminder({ financialRecordId: item.id });
      toast.success(`Cobrança enviada para ${item.patientName}`);
      onResolved(item.id);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao enviar cobrança");
    }
    setBusyId(null);
  };

  const handleMarkPaid = async (item) => {
    setBusyId(item.id);
    try {
      await confirmPayment({ transactionId: item.id, paymentMethod });
      toast.success(`Pagamento de ${item.patientName} registrado`);
      setMarkingPaidId(null);
      onResolved(item.id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao confirmar pagamento");
    }
    setBusyId(null);
  };

  if (!items.length) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Confirmar Cobranças Vencidas</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 px-5 pt-3">
          Antes de enviar a cobrança por WhatsApp, confirme que o pagamento realmente não caiu
          (o profissional pode ter esquecido de dar baixa).
        </p>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border dark:border-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{item.patientName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 dark:text-white">R$ {formatCurrency(item.amount)}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {item.daysOverdue} dia{item.daysOverdue > 1 ? "s" : ""} vencido
                  </p>
                </div>
              </div>

              {markingPaidId === item.id ? (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-4 gap-1.5">
                    {PAYMENT_METHODS.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.key}
                          onClick={() => setPaymentMethod(m.key)}
                          className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border text-[11px] font-medium transition-all
                            ${paymentMethod === m.key ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setMarkingPaidId(null)}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={busyId === item.id}
                      onClick={() => handleMarkPaid(item)}
                    >
                      Confirmar pagamento
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    disabled={busyId === item.id}
                    onClick={() => setMarkingPaidId(item.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Já foi pago
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-orange-600 hover:bg-orange-700"
                    disabled={busyId === item.id || !item.patientPhone}
                    onClick={() => handleConfirmSend(item)}
                    title={!item.patientPhone ? "Paciente sem telefone cadastrado" : undefined}
                  >
                    <Send className="w-3.5 h-3.5" /> Confirmar e enviar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
