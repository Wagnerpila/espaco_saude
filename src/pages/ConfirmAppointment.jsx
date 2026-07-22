
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Calendar, Clock, User, Loader2, Phone, User as UserIcon, MessageCircle } from "lucide-react"; // Added Phone, UserIcon, MessageCircle
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { processAppointmentResponse } from "@/functions/processAppointmentResponse";
import { getAppointmentPublicDetails } from "@/functions/getAppointmentPublicDetails";

export default function ConfirmAppointmentPage() {
  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [professional, setProfessional] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [response, setResponse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  useEffect(() => {
    loadAppointmentData();
  }, []);

  const loadAppointmentData = async () => {
    setIsLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const appointmentId = urlParams.get('id');

      if (!appointmentId) {
        setResponse({ type: 'error', message: 'Link inválido ou ID do agendamento não encontrado.' });
        setIsLoading(false);
        return;
      }

      const details = await getAppointmentPublicDetails(appointmentId);
      const foundAppointment = details.appointment;

      // Check if already processed
      if (foundAppointment.status === 'confirmed') {
        setResponse({ type: 'success', message: 'Agendamento já confirmado anteriormente!' });
        setIsLoading(false);
        return;
      }

      if (foundAppointment.status === 'cancelled') {
        setResponse({ type: 'info', message: 'Este agendamento foi cancelado.' });
        setIsLoading(false);
        return;
      }

      setAppointment(foundAppointment);
      setPatient(details.patient);
      setProfessional(details.professional);
    } catch (error) {
      console.error("Erro ao carregar agendamento:", error);
      setResponse({ type: 'error', message: 'Agendamento não encontrado ou link inválido.' });
    }
    setIsLoading(false);
  };

  const handleResponse = async (action) => {
    if (!appointment) return;

    if (action === 'cancel' && !cancelReason.trim() && !showCancelForm) {
      setShowCancelForm(true);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processAppointmentResponse({
        appointmentId: appointment.id,
        action: action,
        cancelReason: cancelReason.trim()
      });

      if (result.data && result.data.success) {
        setResponse({
          type: 'success',
          message: result.data.message || (action === 'confirm' ? 'Agendamento confirmado!' : 'Agendamento cancelado!')
        });
      } else {
        setResponse({
          type: 'error',
          message: result.data?.message || 'Erro ao processar sua resposta. Tente novamente.'
        });
      }
    } catch (error) {
      console.error("Erro ao processar resposta:", error);
      setResponse({
        type: 'error',
        message: 'Erro de comunicação. Tente novamente ou entre em contato conosco.'
      });
    }
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Carregando informações do agendamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (response) {
    const Icon = response.type === 'success' ? CheckCircle :
                 response.type === 'error' ? XCircle : Calendar;

    const iconColor = response.type === 'success' ? 'text-green-500' :
                     response.type === 'error' ? 'text-red-500' : 'text-blue-500';

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            {response.type !== 'success' && ( // Only show generic icon for error/info, success has its own structure
              <>
                <Icon className={`w-16 h-16 mx-auto mb-4 ${iconColor}`} />
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {response.type === 'success' ? 'Confirmado!' : // This specific line won't be reached for success anymore
                   response.type === 'error' ? 'Ops!' : 'Informação'}
                </h2>
                <p className="text-gray-600 mb-6">{response.message}</p>
              </>
            )}

            {response.type === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {response?.message || 'Operação realizada com sucesso!'}
                </h2>
                <p className="text-gray-600 mb-6">
                  Obrigado por utilizar nossos serviços.
                </p>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => window.location.href = '/PatientDashboard'}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    Acessar Meu Painel
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/PublicChat'}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar Conosco
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                <Phone className="w-4 h-4" />
                <span className="font-medium">Espaço Saúde</span>
              </div>
              <p className="text-sm text-gray-500">💙 Estética • Fisioterapia • Pilates</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment || !patient || !professional) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ops!</h2>
            <p className="text-gray-600">Agendamento não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center border-b">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Confirmar Agendamento
          </CardTitle>
          <p className="text-gray-600 text-sm">Espaço Saúde</p>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{patient.full_name}</p>
                <p className="text-sm text-gray-600">Paciente</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">{professional.full_name}</p>
                <p className="text-sm text-gray-600">{professional.specialty}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">
                  {format(appointmentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {appointment.appointment_time}
                </div>
              </div>
            </div>

            {appointment.service_type && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="font-medium text-gray-900">{appointment.service_type}</p>
                <p className="text-sm text-gray-600">Serviço</p>
              </div>
            )}
          </div>

          {showCancelForm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo do cancelamento (opcional)
                </label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Digite o motivo do cancelamento..."
                  className="w-full"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelForm(false)}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={() => handleResponse('cancel')}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    'Cancelar Agendamento'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={() => handleResponse('cancel')}
                disabled={isProcessing}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleResponse('confirm')}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </Button>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>💙 Estética • Fisioterapia • Pilates</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
