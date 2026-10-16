// Cliente da WAHA (WhatsApp HTTP API) — substitui a Evolution API, que
// deixava mensagens presas em "aguardando" no celular do paciente. Mesma
// interface do evolutionClient (sendText/sendMedia) pra ser trocado via
// services/whatsappClient.js sem mexer em quem envia.
//
// Env vars: WAHA_API_URL (ex.: https://evolution-waha.gc6sum.easypanel.host),
// WAHA_API_KEY (header X-Api-Key) e WAHA_SESSION (padrão "default").

function config() {
  const baseUrl = process.env.WAHA_API_URL;
  const apiKey = process.env.WAHA_API_KEY;
  const session = process.env.WAHA_SESSION || 'default';
  if (!baseUrl) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, session };
}

async function wahaFetch(cfg, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.apiKey ? { 'X-Api-Key': cfg.apiKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WAHA retornou ${res.status} em ${path}: ${text.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

// Números brasileiros: o cadastro guarda com o 9º dígito (5542998615195),
// mas o WhatsApp de muitos DDDs registra a conta sem ele (554298615195@c.us).
// Mandar pro JID errado é exatamente o que deixa a mensagem "aguardando" pra
// sempre — então perguntamos à WAHA qual é o chatId real e guardamos em cache.
const chatIdCache = new Map();

async function resolveChatId(cfg, phoneOrChatId) {
  if (String(phoneOrChatId).includes('@')) return phoneOrChatId;
  const phone = String(phoneOrChatId).replace(/\D/g, '');
  if (chatIdCache.has(phone)) return chatIdCache.get(phone);

  const data = await wahaFetch(
    cfg,
    `/api/contacts/check-exists?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(cfg.session)}`
  );
  if (!data.numberExists || !data.chatId) {
    throw new Error(`Número ${phone} não tem WhatsApp`);
  }
  chatIdCache.set(phone, data.chatId);
  return data.chatId;
}

// Contatos que chegam como "<id>@lid" (privacidade nova do WhatsApp) não
// trazem o telefone — pede pra WAHA o número real. Devolve null se não der.
export async function resolveLidToPhone(lid) {
  const cfg = config();
  if (!cfg) return null;
  try {
    const data = await wahaFetch(cfg, `/api/${encodeURIComponent(cfg.session)}/lids/${encodeURIComponent(lid)}`);
    return data?.pn ? String(data.pn).replace(/@.*/, '') : null;
  } catch (err) {
    console.error(`[waha] Falha ao resolver LID ${lid}:`, err.message);
    return null;
  }
}

// `phoneOrChatId`: dígitos (resolvidos via check-exists) ou um chatId pronto
// (ex.: o `from` de uma mensagem recebida, usado pra responder no mesmo chat).
export async function sendText(phoneOrChatId, message) {
  const cfg = config();
  if (!cfg) return { sent: false, reason: 'waha_not_configured' };

  const chatId = await resolveChatId(cfg, phoneOrChatId);
  await wahaFetch(cfg, '/api/sendText', {
    method: 'POST',
    body: { session: cfg.session, chatId, text: message },
  });
  return { sent: true };
}

// Imagem com legenda. Como na Evolution, `mediaUrl` precisa ser pública — a
// WAHA baixa o arquivo dela. Em algumas versões/engines o envio de mídia é
// recurso do WAHA Plus; se falhar, services/whatsapp.js cai pra texto puro.
export async function sendMedia(phoneOrChatId, mediaUrl, caption) {
  const cfg = config();
  if (!cfg) return { sent: false, reason: 'waha_not_configured' };

  const chatId = await resolveChatId(cfg, phoneOrChatId);
  const filename = String(mediaUrl).split('/').pop()?.split('?')[0] || 'imagem.jpg';
  await wahaFetch(cfg, '/api/sendImage', {
    method: 'POST',
    body: {
      session: cfg.session,
      chatId,
      file: { mimetype: 'image/jpeg', url: mediaUrl, filename },
      caption: caption || '',
    },
  });
  return { sent: true };
}
