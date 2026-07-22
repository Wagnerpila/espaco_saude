import { prisma } from '../db.js';
import { formatPhone } from '../utils/format.js';
import { sendText } from './evolutionClient.js';

// Substitui a função base44 `sendWhatsAppMessage` (que proxiava via n8n).
// Sempre grava a mensagem em WhatsAppConversation para manter o histórico
// visível no painel (WhatsAppConversations.jsx), igual ao comportamento atual.
export async function sendWhatsAppMessage(phone, message) {
  const phoneNorm = formatPhone(phone);
  const now = new Date();

  let status = 'queued';
  let error = null;
  try {
    const result = await sendText(phoneNorm, message);
    status = result.sent ? 'sent' : 'queued';
  } catch (err) {
    status = 'failed';
    error = err.message;
    console.error(`[whatsapp] Falha ao enviar para ${phoneNorm}:`, err.message);
  }

  const conversation = await prisma.whatsAppConversation.findFirst({ where: { phone: phoneNorm } });
  const newMessage = { role: 'assistant', content: message, timestamp: now.toISOString(), outbound: true, status, ...(error ? { error } : {}) };
  const messages = [...(conversation?.messages || []).slice(-18), newMessage];

  if (conversation) {
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { messages, lastActive: now },
    });
  } else {
    await prisma.whatsAppConversation.create({
      data: {
        phone: phoneNorm,
        sessionId: phoneNorm,
        messages,
        lastActive: now,
        state: { step: 'MENU' },
        draft: {},
      },
    });
  }

  return { success: status !== 'failed', phone: phoneNorm, status, error };
}
