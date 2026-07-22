/**
 * Envia mensagem WhatsApp de verdade via webhook do n8n.
 * Integra com Sofia/Evolution API para envio real em número fictício.
 * Payload: { phone, message }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : '55' + digits;
}

Deno.serve(async (req) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  const base44 = createClientFromRequest(req);

  let body = {};
  try { body = await req.json(); } catch (_) {}

  const { phone, message } = body;

  if (!phone || !message) {
    return Response.json({ error: 'phone e message são obrigatórios' }, { status: 400, headers });
  }

  const phoneNorm = formatPhone(phone);
  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
  
  if (!n8nWebhookUrl) {
    console.log(`[sendWhatsAppMessage] N8N_WEBHOOK_URL não configurado. Mensagem salva mas não enviada.`);
    // Fallback: salva no histórico mas não envia
    const now = new Date().toISOString();
    const conversations = await base44.asServiceRole.entities.WhatsAppConversation.filter({ phone: phoneNorm });
    const conversation = conversations[0];
    
    const updatedMessages = [
      ...(conversation?.messages || []).slice(-18),
      { role: 'assistant', content: message, timestamp: now, outbound: true, status: 'queued' }
    ];

    if (conversation) {
      await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, {
        messages: updatedMessages,
        last_active: now
      });
    } else {
      await base44.asServiceRole.entities.WhatsAppConversation.create({
        phone: phoneNorm,
        session_id: phoneNorm,
        messages: updatedMessages,
        last_active: now,
        state: { step: 'MENU' },
        draft: {}
      });
    }

    return Response.json({
      success: true,
      phone: phoneNorm,
      message_preview: message.slice(0, 100),
      warning: 'Webhook do n8n não configurado. Configure N8N_WEBHOOK_URL para envio real.'
    }, { headers });
  }

  // Envia de verdade via n8n webhook
  const now = new Date().toISOString();
  
  try {
    // Faz POST para o webhook do n8n que vai enviar via Evolution API
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phoneNorm,
        text: message,
        message: message,
        from_me: true,
        source: 'admin_panel'
      })
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n webhook retornou ${n8nResponse.status}`);
    }

    // Salva na conversa com status de envio
    const conversations = await base44.asServiceRole.entities.WhatsAppConversation.filter({ phone: phoneNorm });
    const conversation = conversations[0];
    
    const updatedMessages = [
      ...(conversation?.messages || []).slice(-18),
      { role: 'assistant', content: message, timestamp: now, outbound: true, status: 'sent' }
    ];

    if (conversation) {
      await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, {
        messages: updatedMessages,
        last_active: now
      });
    } else {
      await base44.asServiceRole.entities.WhatsAppConversation.create({
        phone: phoneNorm,
        session_id: phoneNorm,
        messages: updatedMessages,
        last_active: now,
        state: { step: 'MENU' },
        draft: {}
      });
    }

    console.log(`[sendWhatsAppMessage] Mensagem enviada via n8n para ${phoneNorm}: ${message.slice(0, 100)}`);

    return Response.json({
      success: true,
      phone: phoneNorm,
      message_preview: message.slice(0, 100),
      status: 'sent'
    }, { headers });

  } catch (error) {
    console.error(`[sendWhatsAppMessage] Erro ao enviar via n8n: ${error.message}`);
    
    // Salva com status de erro
    const conversations = await base44.asServiceRole.entities.WhatsAppConversation.filter({ phone: phoneNorm });
    const conversation = conversations[0];
    
    const updatedMessages = [
      ...(conversation?.messages || []).slice(-18),
      { role: 'assistant', content: message, timestamp: now, outbound: true, status: 'failed', error: error.message }
    ];

    if (conversation) {
      await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, {
        messages: updatedMessages,
        last_active: now
      });
    }

    return Response.json({
      success: false,
      phone: phoneNorm,
      error: error.message,
      status: 'failed'
    }, { status: 500, headers });
  }
});