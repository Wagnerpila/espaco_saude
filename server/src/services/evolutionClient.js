// Cliente direto da Evolution API — substitui o proxy via n8n do base44
// original. A instância já está rodando em outro servidor do usuário; só
// precisamos da URL base, do nome da instância e da API key (env vars).
// Usado tanto para envio proativo (services/whatsapp.js) quanto para
// responder mensagens recebidas pelo bot (services/whatsappBot.js).
export async function sendText(phoneNorm, message) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!baseUrl || !instance || !apiKey) {
    return { sent: false, reason: 'evolution_not_configured' };
  }

  const url = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instance}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number: phoneNorm, text: message }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Evolution API retornou ${res.status}: ${text.slice(0, 300)}`);
  }
  return { sent: true };
}
