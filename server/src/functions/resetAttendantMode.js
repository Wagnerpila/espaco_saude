import { prisma } from '../db.js';
import { formatPhone } from '../utils/format.js';

// Nota: no base44 original esta função não exigia autenticação nenhuma
// (qualquer um com o número de telefone podia resetar o modo atendente).
// Aqui exigimos login (ver routes/functions.routes.js) por segurança.
export async function resetAttendantMode(req, res, next) {
  try {
    const phone = req.body?.phone;
    if (!phone) return res.status(400).json({ error: 'Informe o número (phone)' });

    const phoneNorm = formatPhone(phone);
    const conversation = await prisma.whatsAppConversation.findFirst({ where: { phone: phoneNorm } });
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada', phone: phoneNorm });

    const updatedState = { ...(conversation.state || {}) };
    delete updatedState.attendant_mode_until;

    await prisma.whatsAppConversation.update({ where: { id: conversation.id }, data: { state: updatedState } });

    res.json({
      success: true,
      message: `Modo atendente resetado para ${phoneNorm}`,
      phone: phoneNorm,
      conversation_id: conversation.id,
    });
  } catch (err) {
    next(err);
  }
}
