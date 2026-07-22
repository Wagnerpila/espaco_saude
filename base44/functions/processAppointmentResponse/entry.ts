import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { appointmentId, action, cancelReason } = await req.json();

        if (!appointmentId || !action) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Dados obrigatórios não fornecidos' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get appointment data
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

        // Get related data
        const [patients, professionals] = await Promise.all([
            base44.asServiceRole.entities.Patient.list(),
            base44.asServiceRole.entities.Professional.list()
        ]);

        const patient = patients.find(p => p.id === appointment.patient_id);
        const professional = professionals.find(p => p.id === appointment.professional_id);

        // Update appointment status
        const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
        const updateData = { 
            status: newStatus,
            notes: action === 'cancel' && cancelReason 
                ? `${appointment.notes || ''}\n\nMotivo do cancelamento: ${cancelReason}`.trim()
                : appointment.notes
        };

        await base44.asServiceRole.entities.Appointment.update(appointmentId, updateData);

        // Criar notificação do sistema
        const notificationData = {
            type: action === 'confirm' ? 'appointment_confirmed' : 'appointment_cancelled',
            title: action === 'confirm' ? 'Agendamento Confirmado' : 'Agendamento Cancelado',
            message: `${patient?.full_name} ${action === 'confirm' ? 'confirmou' : 'cancelou'} agendamento para ${format(new Date(appointment.appointment_date), 'dd/MM/yyyy')} às ${appointment.appointment_time}`,
            patient_id: appointment.patient_id,
            appointment_id: appointmentId,
            priority: action === 'cancel' ? 'high' : 'medium',
            data: {
                patient_name: patient?.full_name,
                professional_name: professional?.full_name,
                appointment_date: appointment.appointment_date,
                appointment_time: appointment.appointment_time,
                reason: cancelReason || null
            }
        };

        await base44.asServiceRole.entities.Notification.create(notificationData);

        // Send email notification to professional  
        const appointmentDate = new Date(appointment.appointment_date);
        const dateStr = appointmentDate.toLocaleDateString('pt-BR');
        
        const emailSubject = action === 'confirm' 
            ? `✅ Agendamento Confirmado - ${patient?.full_name}`
            : `❌ Agendamento Cancelado - ${patient?.full_name}`;

        const emailBody = `Olá ${professional?.full_name},

O paciente ${patient?.full_name} ${action === 'confirm' ? 'confirmou' : 'cancelou'} o agendamento:

📅 Data: ${dateStr}
⏰ Horário: ${appointment.appointment_time}
🔸 Serviço: ${appointment.service_type || 'Consulta'}

${action === 'cancel' && cancelReason ? `💬 Motivo: ${cancelReason}` : ''}

📱 Contato do paciente: ${patient?.phone || 'Não informado'}

Atenciosamente,
Sistema Espaço Saúde
💙 Estética • Fisioterapia • Pilates`;

        try {
            await base44.asServiceRole.integrations.invoke('Core-SendEmail', {
                to: professional?.email || 'admin@espacosaude.com',
                subject: emailSubject,
                body: emailBody,
                from_name: 'Espaço Saúde'
            });
        } catch (emailError) {
            console.error("Erro ao enviar email:", emailError);
            // Continue execution even if email fails
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: action === 'confirm' ? 'Agendamento confirmado com sucesso!' : 'Agendamento cancelado com sucesso!'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Erro ao processar resposta:", error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: 'Erro interno do servidor' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});