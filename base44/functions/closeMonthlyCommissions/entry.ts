import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 });
    }

    const { month, year, professional_id } = await req.json();

    if (!month || !year) {
      return Response.json({ error: 'Mês e ano são obrigatórios' }, { status: 400 });
    }

    // Verificar se já existe fechamento
    const existingClosings = await base44.asServiceRole.entities.MonthlyClosing.filter({
      month: month,
      year: year,
      professional_id: professional_id || null
    });

    if (existingClosings.length > 0 && existingClosings[0].status === 'closed') {
      return Response.json({ 
        error: 'Já existe um fechamento para este período',
        closing: existingClosings[0]
      }, { status: 400 });
    }

    // Buscar comissões do período
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    let commissions = await base44.asServiceRole.entities.Commission.list();
    
    // Filtrar comissões do período
    commissions = commissions.filter(c => {
      const serviceDate = new Date(c.service_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const matchesDate = serviceDate >= start && serviceDate <= end;
      const matchesProfessional = professional_id ? c.professional_id === professional_id : true;
      const notClosed = !c.monthly_closing_id;
      
      return matchesDate && matchesProfessional && notClosed;
    });

    // Calcular totais
    const totalAppointments = commissions.length;
    const totalRevenue = commissions.reduce((sum, c) => sum + (c.service_value || 0), 0);
    const totalCommission = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);

    // Criar fechamento
    const closing = await base44.asServiceRole.entities.MonthlyClosing.create({
      month: month,
      year: year,
      professional_id: professional_id || null,
      total_appointments: totalAppointments,
      total_revenue: totalRevenue,
      total_commission: totalCommission,
      status: 'closed',
      closing_date: new Date().toISOString().split('T')[0],
      commission_ids: commissions.map(c => c.id)
    });

    // Atualizar comissões com o ID do fechamento
    for (const commission of commissions) {
      await base44.asServiceRole.entities.Commission.update(commission.id, {
        monthly_closing_id: closing.id
      });
    }

    return Response.json({ 
      success: true,
      closing,
      commissions_count: commissions.length,
      message: 'Fechamento realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao fechar comissões:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});