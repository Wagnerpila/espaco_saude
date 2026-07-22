import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 });
    }

    const { commission_ids, payment_status, payment_date } = await req.json();

    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return Response.json({ error: 'commission_ids é obrigatório e deve ser um array' }, { status: 400 });
    }

    const updates = [];

    for (const commission_id of commission_ids) {
      const updateData = {
        payment_status: payment_status || 'paid'
      };

      if (payment_date) {
        updateData.payment_date = payment_date;
      } else if (payment_status === 'paid') {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      }

      const updated = await base44.asServiceRole.entities.Commission.update(
        commission_id,
        updateData
      );
      
      updates.push(updated);
    }

    return Response.json({ 
      success: true,
      updated_count: updates.length,
      message: `${updates.length} comissão(ões) atualizada(s)`
    });

  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});