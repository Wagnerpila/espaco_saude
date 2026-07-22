import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { appointmentId, paymentStatus = 'pending' } = await req.json();

        if (!appointmentId) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'ID do agendamento é obrigatório' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Buscar o agendamento
        const appointments = await base44.asServiceRole.entities.Appointment.list();
        const appointment = appointments.find(apt => apt.id === appointmentId);

        if (!appointment) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Agendamento não encontrado' 
            }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verificar se já existe transação para este agendamento
        const existingTransactions = await base44.asServiceRole.entities.FinancialRecord.filter({
            appointment_id: appointmentId
        });

        if (existingTransactions.length > 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Transação já existe para este agendamento' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Buscar dados do paciente
        const patients = await base44.asServiceRole.entities.Patient.list();
        const patient = patients.find(p => p.id === appointment.patient_id);

        // Criar transação financeira
        const transactionData = {
            type: 'income',
            appointment_id: appointmentId,
            patient_id: appointment.patient_id,
            professional_id: appointment.professional_id,
            description: `Consulta - ${patient?.full_name || 'Paciente'} - ${appointment.service_type || 'Consulta'}`,
            amount: appointment.value || 0,
            payment_method: 'pending',
            transaction_date: appointment.appointment_date,
            payment_status: paymentStatus
        };

        const transaction = await base44.asServiceRole.entities.FinancialRecord.create(transactionData);

        // Criar notificação de pagamento pendente
        const notificationData = {
            type: 'payment_pending',
            title: 'Pagamento Pendente',
            message: `Consulta de ${patient?.full_name} concluída. Aguardando confirmação de pagamento de R$ ${(appointment.value || 0).toFixed(2)}`,
            patient_id: appointment.patient_id,
            appointment_id: appointmentId,
            financial_record_id: transaction.id,
            priority: 'high',
            data: {
                patient_name: patient?.full_name,
                amount: appointment.value || 0,
                service_type: appointment.service_type
            }
        };

        await base44.asServiceRole.entities.Notification.create(notificationData);

        return new Response(JSON.stringify({ 
            success: true,
            transaction,
            message: 'Transação criada com sucesso'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Erro ao criar transação:", error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: 'Erro interno do servidor' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});