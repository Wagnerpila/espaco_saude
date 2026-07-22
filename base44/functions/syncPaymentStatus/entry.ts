import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { appointmentId, paymentStatus } = await req.json();

        if (!appointmentId || !paymentStatus) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'ID do agendamento e status de pagamento são obrigatórios' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Atualizar status de pagamento no agendamento
        await base44.asServiceRole.entities.Appointment.update(appointmentId, { 
            payment_status: paymentStatus 
        });

        // Atualizar status na transação financeira correspondente
        const transactions = await base44.asServiceRole.entities.FinancialRecord.filter({
            appointment_id: appointmentId
        });

        if (transactions.length > 0) {
            await base44.asServiceRole.entities.FinancialRecord.update(transactions[0].id, {
                payment_status: paymentStatus
            });
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: 'Status de pagamento sincronizado com sucesso'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Erro ao sincronizar status de pagamento:", error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: 'Erro interno do servidor' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});