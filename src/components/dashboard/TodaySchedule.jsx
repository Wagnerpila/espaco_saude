import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  MessageCircle,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Appointment } from "@/entities/Appointment";
import { createFinancialTransaction } from "@/functions/createFinancialTransaction";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800"
};

const statusLabels = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído"
};

const paymentStatusColors = {
  pending: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800"
};

export default function TodaySchedule({ appointments, allAppointments, isLoading, onRefresh }) {
  const [processingAppointment, setProcessingAppointment] = useState(null);

  const todayAppointments = appointments || [];

  const handleCompleteAppointment = async (appointment) => {
    if (!appointment.value || appointment.value <= 0) {
      alert("Para finalizar a consulta, é necessário definir um valor. Edite o agendamento para adicionar o valor.");
      return;
    }

    setProcessingAppointment(appointment.id);
    
    try {
      // 1. Atualizar status do agendamento para "completed"
      await Appointment.update(appointment.id, { 
        status: 'completed',
        payment_status: 'pending' // Inicialmente pendente
      });

      // 2. Criar transação financeira automaticamente
      const response = await createFinancialTransaction({
        appointmentId: appointment.id,
        paymentStatus: 'pending'
      });

      if (response.data.success) {
        alert('Consulta finalizada! Transação financeira criada automaticamente como pendente.');
        onRefresh(); // Recarregar dados
      } else {
        alert('Consulta finalizada, mas erro ao criar transação: ' + response.data.message);
      }
    } catch (error) {
      console.error("Erro ao finalizar consulta:", error);
      alert('Erro ao finalizar consulta');
    }
    
    setProcessingAppointment(null);
  };

  const handleRequestPayment = (appointment) => {
    // Buscar dados do paciente para enviar WhatsApp
    const patient = appointment.patient;
    
    if (!patient?.phone) {
      alert("Este paciente não possui um número de telefone cadastrado.");
      return;
    }

    const message = `🏥 *Espaço Saúde* 🏥

Olá ${patient.full_name}!

Sua consulta foi finalizada com sucesso! 

💰 Valor da consulta: *R$ ${(appointment.value || 0).toFixed(2).replace('.', ',')}*
📅 Data: ${format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
🕒 Horário: ${appointment.appointment_time}
⚕️ Serviço: ${appointment.service_type || 'Consulta'}

Para realizar o pagamento, entre em contato conosco ou compareça à clínica.

Agradecemos a sua confiança!
💙 Estética • Fisioterapia • Pilates`;

    const phoneNumber = patient.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <Calendar className="w-5 h-5 text-blue-500" />
          Agenda de Hoje
          <Badge variant="outline">{todayAppointments.length} consultas</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Nenhum agendamento para hoje</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <span className="text-sm font-medium text-blue-600">
                      {appointment.appointment_time}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {appointment.patient?.full_name || 'Paciente não encontrado'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {appointment.service_type || 'Consulta'}
                    </p>
                    {appointment.value > 0 && (
                      <p className="text-sm text-green-600 font-medium">
                        R$ {appointment.value.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={statusColors[appointment.status]}>
                    {statusLabels[appointment.status]}
                  </Badge>
                  
                  {appointment.status === 'completed' && appointment.payment_status && (
                    <Badge className={paymentStatusColors[appointment.payment_status]}>
                      {appointment.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  )}

                  <div className="flex gap-1">
                    {appointment.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteAppointment(appointment)}
                        disabled={processingAppointment === appointment.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingAppointment === appointment.id ? (
                          <AlertCircle className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </Button>
                    )}

                    {appointment.status === 'completed' && appointment.payment_status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestPayment(appointment)}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}