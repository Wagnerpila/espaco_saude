import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { transactionId, paymentMethod, notes } = await req.json();

        if (!transactionId || !paymentMethod) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'ID da transação e método de pagamento são obrigatórios' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Buscar a transação
        const transactions = await base44.asServiceRole.entities.FinancialRecord.list();
        const transaction = transactions.find(t => t.id === transactionId);

        if (!transaction) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Transação não encontrada' 
            }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Atualizar transação
        const updateData = {
            payment_method: paymentMethod,
            payment_status: 'paid',
            notes: notes ? `${transaction.notes || ''}\n\nPagamento confirmado: ${notes}`.trim() : transaction.notes
        };

        await base44.asServiceRole.entities.FinancialRecord.update(transactionId, updateData);

        // Atualizar status de pagamento no agendamento
        if (transaction.appointment_id) {
            await base44.asServiceRole.entities.Appointment.update(transaction.appointment_id, {
                payment_status: 'paid'
            });
        }

        // Buscar dados do paciente
        const patients = await base44.asServiceRole.entities.Patient.list();
        const patient = patients.find(p => p.id === transaction.patient_id);

        // Criar notificação de pagamento confirmado
        const notificationData = {
            type: 'payment_confirmed',
            title: 'Pagamento Confirmado',
            message: `Pagamento de R$ ${transaction.amount.toFixed(2)} confirmado para ${patient?.full_name}`,
            patient_id: transaction.patient_id,
            appointment_id: transaction.appointment_id,
            financial_record_id: transactionId,
            priority: 'medium',
            data: {
                patient_name: patient?.full_name,
                amount: transaction.amount,
                payment_method: paymentMethod
            }
        };

        await base44.asServiceRole.entities.Notification.create(notificationData);

        return new Response(JSON.stringify({ 
            success: true,
            message: 'Pagamento confirmado com sucesso'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Erro ao confirmar pagamento:", error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: 'Erro interno do servidor' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});