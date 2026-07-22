import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { appointment_id } = await req.json();

    if (!appointment_id) {
      return Response.json({ error: 'appointment_id é obrigatório' }, { status: 400 });
    }

    // Buscar dados do atendimento
    const appointment = await base44.asServiceRole.entities.Appointment.get(appointment_id);
    
    if (!appointment) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // Apenas gerar comissão se o atendimento está finalizado
    if (appointment.status !== 'completed') {
      return Response.json({ 
        message: 'Comissão não gerada - atendimento não finalizado',
        status: appointment.status 
      });
    }

    // Verificar se já existe comissão para este atendimento
    const existingCommissions = await base44.asServiceRole.entities.Commission.filter({
      appointment_id: appointment_id
    });

    if (existingCommissions.length > 0) {
      return Response.json({ 
        message: 'Comissão já existe para este atendimento',
        commission: existingCommissions[0]
      });
    }

    // Buscar dados do profissional
    const professional = await base44.asServiceRole.entities.Professional.get(appointment.professional_id);
    
    if (!professional) {
      return Response.json({ error: 'Profissional não encontrado' }, { status: 404 });
    }

    // Determinar percentual de comissão
    let commissionPercentage = professional.default_commission_percentage || 0;

    // Se houver service_type, tentar buscar configuração específica do serviço
    if (appointment.service_type) {
      const servicePlans = await base44.asServiceRole.entities.ServicePlan.filter({
        plan_name: appointment.service_type
      });
      
      if (servicePlans.length > 0 && servicePlans[0].commission_percentage) {
        commissionPercentage = servicePlans[0].commission_percentage;
      }
    }

    // Calcular valor da comissão
    const serviceValue = appointment.value || 0;
    const commissionValue = (serviceValue * commissionPercentage) / 100;

    // Criar registro de comissão
    const commission = await base44.asServiceRole.entities.Commission.create({
      appointment_id: appointment.id,
      professional_id: appointment.professional_id,
      patient_id: appointment.patient_id,
      service_name: appointment.service_type || 'Atendimento',
      service_value: serviceValue,
      commission_percentage: commissionPercentage,
      commission_value: commissionValue,
      payment_status: 'pending',
      service_date: appointment.appointment_date
    });

    return Response.json({ 
      success: true,
      commission,
      message: 'Comissão gerada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao gerar comissão:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});