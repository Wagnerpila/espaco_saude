import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppMessageSender() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    message: '',
    test_number: '5511999999999'
  });
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await base44.entities.Patient.list();
        setPatients(data.filter(p => p.active !== false).sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } catch (error) {
        toast.error('Erro ao carregar pacientes');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadPatients();
  }, []);

  const handleSend = async () => {
    if (!formData.patient_id || !formData.message.trim()) {
      toast.error('Preencha o paciente e a mensagem');
      return;
    }

    setSending(true);
    try {
      const patient = patients.find(p => p.id === formData.patient_id);
      
      // Usar número fictício para teste
      const payload = {
        phone: formData.test_number,
        message: formData.message.trim()
      };

      const response = await base44.functions.invoke('sendWhatsAppMessage', payload);

      setResponses([
        {
          id: Date.now(),
          patient_name: patient.full_name,
          phone: formData.test_number,
          message: formData.message.slice(0, 100) + (formData.message.length > 100 ? '...' : ''),
          status: 'success',
          timestamp: new Date().toLocaleTimeString('pt-BR')
        },
        ...responses
      ]);

      setFormData(prev => ({ ...prev, message: '' }));
      toast.success(`Mensagem enviada para ${patient.full_name}`);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
      console.error(error);
      
      setResponses([
        {
          id: Date.now(),
          patient_name: patients.find(p => p.id === formData.patient_id)?.full_name || 'Desconhecido',
          phone: formData.test_number,
          message: formData.message.slice(0, 100) + (formData.message.length > 100 ? '...' : ''),
          status: 'error',
          error: error.message,
          timestamp: new Date().toLocaleTimeString('pt-BR')
        },
        ...responses
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Formulário */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <CardTitle>Enviar Mensagem WhatsApp (Teste)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Paciente */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Selecione o Paciente
            </label>
            <select
              value={formData.patient_id}
              onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Escolha um paciente --</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name} ({patient.phone || 'sem telefone'})
                </option>
              ))}
            </select>
          </div>

          {/* Número de Teste */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Número WhatsApp (Fictício para Teste)
            </label>
            <Input
              value={formData.test_number}
              onChange={(e) => setFormData(prev => ({ ...prev, test_number: e.target.value }))}
              placeholder="5511999999999"
              className="text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Use um número fictício para teste. A mensagem será registrada no sistema.
            </p>
          </div>

          {/* Campo de Mensagem */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Mensagem
            </label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Escreva a mensagem aqui..."
              className="min-h-[120px] text-sm resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.message.length} caracteres
            </p>
          </div>

          {/* Botão Enviar */}
          <Button
            onClick={handleSend}
            disabled={sending || !formData.patient_id || !formData.message.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Envios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {responses.map(resp => (
                <div
                  key={resp.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    resp.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {resp.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {resp.patient_name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {resp.phone}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {resp.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        "{resp.message}"
                      </p>
                      {resp.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Erro: {resp.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}