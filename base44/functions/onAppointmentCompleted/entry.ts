import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const appointment = payload.data;
    if (!appointment?.package_id) {
      return Response.json({ message: 'Sem plano vinculado, nenhuma ação necessária' });
    }

    const pkg = await base44.asServiceRole.entities.ServicePackage.get(appointment.package_id);
    if (!pkg || pkg.status !== 'active') {
      return Response.json({ message: 'Pacote não ativo' });
    }

    const newSessionsUsed = (pkg.sessions_used || 0) + 1;
    const maxSessions = pkg.sessions_per_cycle || pkg.max_sessions || 0;

    await base44.asServiceRole.entities.ServicePackage.update(pkg.id, {
      sessions_used: newSessionsUsed
    });

    // Se atingiu o limite, criar notificação de renovação
    if (maxSessions > 0 && newSessionsUsed >= maxSessions) {
      await base44.asServiceRole.entities.ServicePackage.update(pkg.id, {
        status: 'completed'
      });

      // Buscar dados do paciente para notificação
      const patient = await base44.asServiceRole.entities.Patient.get(appointment.patient_id);

      await base44.asServiceRole.entities.Notification.create({
        type: 'system_alert',
        title: `Renovação necessária: ${pkg.plan_name}`,
        message: `O paciente ${patient?.full_name || 'N/A'} concluiu todas as ${maxSessions} sessões do plano "${pkg.plan_name}". Entre em contato para renovação.`,
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        status: 'unread',
        priority: 'high'
      });
    }

    return Response.json({
      success: true,
      sessions_used: newSessionsUsed,
      max_sessions: maxSessions,
      cycle_complete: maxSessions > 0 && newSessionsUsed >= maxSessions
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});