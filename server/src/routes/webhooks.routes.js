import { Router } from 'express';
import { processInboundMessage } from '../services/whatsappBot.js';
import { sendText } from '../services/evolutionClient.js';

export const webhooksRouter = Router();

function tryParseJSON(val) {
  if (typeof val === 'object' && val !== null) return val;
  if (typeof val === 'string') {
    const clean = val.replace(/^=+/, '').trim();
    try {
      return JSON.parse(clean);
    } catch (_err) {
      return null;
    }
  }
  return null;
}

function extractTextFromMsg(msgObj) {
  if (!msgObj) return '';
  return msgObj.conversation || msgObj.extendedTextMessage?.text || msgObj.imageMessage?.caption || msgObj.videoMessage?.caption || '';
}

function cleanStr(val) {
  return String(val || '').replace(/^=+/, '').trim();
}

// Porte da extração de payload de base44/functions/sofiaAgent/entry.ts —
// tolerante a diferentes formatos (Evolution API direto, ou um payload já
// remodelado por alguma automação intermediária). Devolve { phone, message,
// sessionId, fromMe } ou null se não achou nada aproveitável.
function extractInboundData(body) {
  let phone = '';
  let sessionId = '';
  let message = '';
  let fromMe = false;

  // Estratégia 1: body.body como objeto ou string JSON
  const bodyBodyObj = tryParseJSON(body.body);
  if (bodyBodyObj) {
    const evData = tryParseJSON(bodyBodyObj.data) || {};
    const evMsg = tryParseJSON(evData.message) || {};
    const evKey = tryParseJSON(evData.key) || {};
    const rawText = extractTextFromMsg(evMsg);
    if (rawText) {
      message = String(rawText).trim();
      phone = cleanStr(evKey.remoteJid) || cleanStr(bodyBodyObj.instance) || '';
      sessionId = cleanStr(evKey.id) || cleanStr(bodyBodyObj.instance) || phone;
      fromMe = evKey.fromMe === true;
    }
  }

  // Estratégia 2: body.data como objeto ou string JSON (Evolution API direto)
  if (!message) {
    const bodyDataObj = tryParseJSON(body.data);
    if (bodyDataObj) {
      const evMsg = tryParseJSON(bodyDataObj.message) || {};
      const evKey = tryParseJSON(bodyDataObj.key) || {};
      const rawText = extractTextFromMsg(evMsg);
      if (rawText) {
        message = String(rawText).trim();
        phone = cleanStr(evKey.remoteJid) || cleanStr(body.instance) || '';
        sessionId = cleanStr(evKey.id) || cleanStr(body.instance) || phone;
        fromMe = evKey.fromMe === true;
      }
    }
  }

  // Estratégia 3: campos diretos no body (ex.: chamada manual de teste)
  if (!message) {
    const rawMsg = cleanStr(body.message);
    if (rawMsg && rawMsg !== '[object Object]' && !rawMsg.startsWith('{')) {
      message = rawMsg;
    }
    if (!message) {
      const msgObj = tryParseJSON(body.message);
      if (msgObj) {
        const rawText = extractTextFromMsg(msgObj);
        if (rawText) message = String(rawText).trim();
      }
    }
    if (message) {
      phone = cleanStr(body.phone);
      sessionId = cleanStr(body.session_id);
      fromMe = body.fromMe === true;
    }
  }

  if (!phone || !message) return null;
  return { phone: phone.replace(/@.*/, ''), message, sessionId, fromMe, isGroup: phone.includes('@g.us') };
}

// Recebe eventos inbound da Evolution API (mensagens do WhatsApp) e responde
// via evolutionClient — substitui o fluxo antigo Evolution -> n8n -> sofiaAgent.
// Autenticação: header x-webhook-secret OU query ?secret=, comparado com
// EVOLUTION_WEBHOOK_SECRET (se a env var não estiver setada, aceita sem checar
// — mesmo comportamento "gracioso" usado no resto do backend para esta fase).
webhooksRouter.post('/evolution', async (req, res) => {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers['x-webhook-secret'] || req.query.secret;
    if (provided !== secret) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
  }

  const body = req.body || {};

  // Só nos interessam eventos de mensagem recebida — ignora silenciosamente
  // qualquer outro tipo de evento que a Evolution mande para essa mesma URL
  // (connection.update, qrcode.updated, etc.).
  if (body.event && !/messages\.upsert/i.test(body.event)) {
    return res.json({ ignored: true, reason: 'evento não tratado' });
  }

  const extracted = extractInboundData(body);
  if (!extracted) {
    return res.json({ ignored: true, reason: 'payload sem texto/telefone reconhecível' });
  }

  // Mensagens enviadas pelo próprio número da clínica (fromMe) não devem
  // disparar o bot — sem isso o bot responderia a si mesmo em loop.
  if (extracted.fromMe) {
    return res.json({ ignored: true, reason: 'fromMe' });
  }

  // Grupos não são tratados pelo fluxo de agendamento (JID termina em @g.us).
  if (extracted.isGroup) {
    return res.json({ ignored: true, reason: 'grupo' });
  }

  try {
    const result = await processInboundMessage({
      phone: extracted.phone,
      message: extracted.message,
      sessionId: extracted.sessionId,
    });

    if (!result.ignored && result.reply) {
      await sendText(result.phone, result.reply).catch((err) => {
        console.error(`[webhooks/evolution] Falha ao enviar resposta para ${result.phone}:`, err.message);
      });
    }

    res.json(result);
  } catch (err) {
    console.error('[webhooks/evolution] Erro ao processar mensagem:', err);
    res.status(500).json({ error: err.message });
  }
});
