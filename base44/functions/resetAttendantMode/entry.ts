import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : '55' + digits;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  let body = {};
  try { body = await req.json(); } catch (_) {}

  const phone = body.phone;
  if (!phone) {
    return Response.json({ error: 'Informe o número (phone)' }, { status: 400, headers });
  }

  const phoneNorm = formatPhone(phone);
  const base44 = createClientFromRequest(req);

  try {
    const conversations = await base44.asServiceRole.entities.WhatsAppConversation.filter({ phone: phoneNorm });
    const conversation = conversations[0];

    if (!conversation) {
      return Response.json({ error: 'Conversa não encontrada', phone: phoneNorm }, { status: 404, headers });
    }

    // Limpar o attendant_mode_until do state
    const updatedState = conversation.state || {};
    delete updatedState.attendant_mode_until;

    await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, { state: updatedState });

    return Response.json({ 
      success: true, 
      message: `Modo atendente resetado para ${phoneNorm}`,
      phone: phoneNorm,
      conversation_id: conversation.id
    }, { headers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers });
  }
});