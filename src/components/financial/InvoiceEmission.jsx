import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, FileDown, CheckCircle, Receipt } from "lucide-react";
import { exportReceiptToPdf } from "@/utils/financialExport";

function formatDateBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const METHOD_LABELS = { pix: 'PIX', cash: 'Dinheiro', card: 'Cartão', bank_transfer: 'Transferência', pending: 'Pendente' };

export default function InvoiceEmission({ patients, professionals, transactions = [] }) {
  const [form, setForm] = useState({
    patient_id: '',
    professional_id: '',
    service_description: '',
    value: '',
    issue_date: new Date().toISOString().slice(0, 10),
    payment_method: 'pix',
    notes: '',
    iss_aliquot: '5',
  });
  const [invoice, setInvoice] = useState(null);
  const [selectedTxId, setSelectedTxId] = useState('');

  const patient = patients.find(p => p.id === form.patient_id);
  const professional = professionals.find(p => p.id === form.professional_id);

  // Transações do paciente selecionado
  const patientTransactions = form.patient_id
    ? transactions.filter(t => t.patient_id === form.patient_id && t.type === 'income')
    : [];

  const handlePatientChange = (patientId) => {
    setForm(f => ({ ...f, patient_id: patientId, professional_id: '', service_description: '', value: '', payment_method: 'pix' }));
    setSelectedTxId('');
    setInvoice(null);
  };

  const handleSelectTransaction = (txId) => {
    setSelectedTxId(txId);
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    setForm(f => ({
      ...f,
      professional_id: tx.professional_id || '',
      service_description: tx.description || '',
      value: tx.amount ? String(tx.amount) : '',
      payment_method: tx.payment_method || 'pix',
      issue_date: tx.transaction_date || f.issue_date,
      notes: tx.notes || '',
    }));
    setInvoice(null);
  };

  const handleGenerate = () => {
    if (!form.patient_id || !form.service_description || !form.value) {
      alert("Preencha: paciente, descrição do serviço e valor.");
      return;
    }
    const gross = parseFloat(form.value) || 0;
    const iss = gross * (parseFloat(form.iss_aliquot) || 0) / 100;
    const net = gross - iss;
    const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
    setInvoice({
      receipt_number: receiptNumber,
      issue_date: form.issue_date,
      service_description: form.service_description,
      payment_method: METHOD_LABELS[form.payment_method] || form.payment_method,
      gross_value: gross,
      iss_value: iss,
      net_value: net,
      iss_aliquot: parseFloat(form.iss_aliquot) || 0,
      notes: form.notes,
      _patient: patient,
      _professional: professional,
    });
  };

  const handlePrint = () => {
    if (invoice) exportReceiptToPdf(invoice);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4 max-w-5xl">
      {/* Form */}
      <Card className="shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-blue-500" />
              Dados do Comprovante / Recibo
            </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          <div>
            <Label className="text-sm mb-1 block">Paciente (tomador)*</Label>
            <Select value={form.patient_id} onValueChange={handlePatientChange}>
              <SelectTrigger><SelectValue placeholder="Selecione o paciente..." /></SelectTrigger>
              <SelectContent>
                {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Transações do paciente */}
          {form.patient_id && (
            <div>
              <Label className="text-sm mb-1 block">Selecionar transação do paciente</Label>
              {patientTransactions.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-1">Nenhuma transação encontrada para este paciente.</p>
              ) : (
                <Select value={selectedTxId} onValueChange={handleSelectTransaction}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma transação para preencher..." /></SelectTrigger>
                  <SelectContent>
                    {patientTransactions.map(tx => (
                      <SelectItem key={tx.id} value={tx.id}>
                        {formatDateBR(tx.transaction_date)} — {tx.description} — R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div>
            <Label className="text-sm mb-1 block">Profissional responsável</Label>
            <Select value={form.professional_id} onValueChange={v => setForm(f => ({ ...f, professional_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o profissional..." /></SelectTrigger>
              <SelectContent>
                {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm mb-1 block">Descrição do serviço*</Label>
            <Input placeholder="Ex: Sessão de fisioterapia ortopédica" value={form.service_description}
              onChange={e => setForm(f => ({ ...f, service_description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1 block">Valor (R$)*</Label>
              <Input type="number" placeholder="0,00" value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Alíquota ISS (%)</Label>
              <Input type="number" value={form.iss_aliquot}
                onChange={e => setForm(f => ({ ...f, iss_aliquot: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1 block">Data de emissão</Label>
              <Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Forma de pagamento</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="bank_transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-1 block">Observações</Label>
            <Textarea placeholder="Informações adicionais..." value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          {form.value && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-600">Valor bruto:</span><span className="font-semibold">R$ {parseFloat(form.value || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">ISS ({form.iss_aliquot}%):</span><span className="text-red-500">- R$ {(parseFloat(form.value || 0) * parseFloat(form.iss_aliquot || 0) / 100).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1"><span>Valor líquido:</span><span className="text-green-600">R$ {(parseFloat(form.value || 0) * (1 - parseFloat(form.iss_aliquot || 0) / 100)).toFixed(2)}</span></div>
            </div>
          )}

          <Button onClick={handleGenerate} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
            <Receipt className="w-4 h-4" />
            Gerar Comprovante / Recibo
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className={`shadow-sm transition-all ${!invoice ? 'opacity-50' : ''}`}>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Comprovante / Recibo Gerado
            </CardTitle>
            {invoice && (
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                <FileDown className="w-4 h-4" /> Baixar PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {!invoice ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">O comprovante aparecerá aqui após a geração.</p>
            </div>
          ) : (
            <div className="space-y-4 text-sm" id="invoice-preview">
              {/* Header */}
              <div className="bg-blue-600 text-white rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex-shrink-0">
                    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b73e93560562b92900ccee/37d55f318_espaosade1.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <p className="font-bold text-lg">COMPROVANTE DE SERVIÇO</p>
                </div>
                <p className="text-blue-200 text-xs">Clínica Espaço Saúde</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Nº do Comprovante</p>
                <p className="font-bold text-blue-600">{invoice.receipt_number}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Data:</span><span className="font-medium">{formatDateBR(invoice.issue_date)}</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Prestador:</span><span className="font-medium">Clínica Espaço Saúde</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Paciente:</span><span className="font-medium">{invoice._patient?.full_name || '—'}</span></div>
                {invoice._patient?.cpf && <div className="flex justify-between border-b pb-1"><span className="text-gray-500">CPF:</span><span className="font-mono">{invoice._patient.cpf}</span></div>}
                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Profissional:</span><span className="font-medium">{invoice._professional?.full_name || '—'}</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Serviço:</span><span className="font-medium">{invoice.service_description}</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Pagamento:</span><span className="font-medium">{invoice.payment_method}</span></div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-600">Valor:</span><span className="font-semibold">R$ {invoice.gross_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                {invoice.iss_aliquot > 0 && <>
                  <div className="flex justify-between text-red-500"><span>ISS ({invoice.iss_aliquot}%):</span><span>- R$ {invoice.iss_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between font-bold text-green-700 border-t pt-1.5"><span>Valor líquido:</span><span>R$ {invoice.net_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                </>}
              </div>

              {invoice.notes && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Observações</p>
                  <p className="text-gray-700 dark:text-gray-300">{invoice.notes}</p>
                </div>
              )}

              <Badge className="bg-green-100 text-green-700">✓ Comprovante emitido</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}