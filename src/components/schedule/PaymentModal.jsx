import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, DollarSign, CreditCard, Banknote, Smartphone, Building2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Appointment as AppointmentEntity } from "@/entities/all";

const PAYMENT_METHODS = [
  { key: "cash",          label: "Dinheiro",          icon: Banknote },
  { key: "pix",           label: "PIX",               icon: Smartphone },
  { key: "card",          label: "Cartão",             icon: CreditCard },
  { key: "bank_transfer", label: "Transferência",      icon: Building2 },
];

export default function PaymentModal({ appointment, patient, professional, onClose, onPaid }) {
  const [method, setMethod] = useState("pix");
  const [value, setValue] = useState(appointment.value || 0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // 1. Criar registro financeiro
      await base44.entities.FinancialRecord.create({
        type: "income",
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        professional_id: appointment.professional_id,
        description: `${appointment.service_type || 'Consulta'} - ${patient?.full_name || ''}`,
        amount: parseFloat(value),
        payment_method: method,
        payment_status: "paid",
        transaction_date: appointment.appointment_date,
        notes: `Pagamento via ${PAYMENT_METHODS.find(m => m.key === method)?.label}`
      });

      // 2. Criar comissão se profissional tiver percentual configurado
      if (professional?.default_commission_percentage > 0) {
        const commissionValue = (parseFloat(value) * professional.default_commission_percentage) / 100;
        await base44.entities.Commission.create({
          appointment_id: appointment.id,
          professional_id: appointment.professional_id,
          patient_id: appointment.patient_id,
          service_name: appointment.service_type || 'Consulta',
          service_value: parseFloat(value),
          commission_percentage: professional.default_commission_percentage,
          commission_value: commissionValue,
          payment_status: "pending",
          service_date: appointment.appointment_date,
        });
      }

      // 3. Atualizar status de pagamento do agendamento
      await AppointmentEntity.update(appointment.id, { payment_status: "paid" });

      setDone(true);
      setTimeout(() => {
        onPaid && onPaid();
        onClose();
      }, 1500);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-gray-900 text-lg">Acessar Cobrança</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-green-700 text-lg">Pagamento registrado!</p>
            <p className="text-sm text-gray-500">Financeiro e comissão sincronizados.</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Patient & service info */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 uppercase font-medium">Paciente</p>
              <p className="font-semibold text-gray-900">{patient?.full_name || '—'}</p>
              <p className="text-sm text-gray-500">{appointment.service_type || 'Consulta'} • {appointment.appointment_date}</p>
            </div>

            {/* Value */}
            <div>
              <label className="text-xs text-gray-400 uppercase font-medium block mb-1">Valor (R$)</label>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                min="0"
                step="0.01"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="text-xs text-gray-400 uppercase font-medium block mb-2">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMethod(m.key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                        ${method === m.key ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Commission preview */}
            {professional?.default_commission_percentage > 0 && (
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                <p className="font-medium">Comissão de {professional.full_name}</p>
                <p>{professional.default_commission_percentage}% = <strong>R$ {((parseFloat(value) || 0) * professional.default_commission_percentage / 100).toFixed(2)}</strong></p>
              </div>
            )}

            {/* Confirm */}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-11"
              onClick={handleConfirm}
              disabled={loading || !value || parseFloat(value) <= 0}
            >
              {loading ? "Registrando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}