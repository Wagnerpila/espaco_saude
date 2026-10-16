// Escolhe o provedor de WhatsApp em uso. WHATSAPP_PROVIDER=waha|evolution;
// sem a variável, usa WAHA se WAHA_API_URL estiver setada, senão Evolution.
// Mantém a Evolution disponível como fallback caso precise voltar atrás.
import * as evolution from './evolutionClient.js';
import * as waha from './wahaClient.js';

function provider() {
  const explicit = (process.env.WHATSAPP_PROVIDER || '').toLowerCase();
  if (explicit === 'waha' || explicit === 'evolution') return explicit;
  return process.env.WAHA_API_URL ? 'waha' : 'evolution';
}

export function sendText(phone, message) {
  return provider() === 'waha' ? waha.sendText(phone, message) : evolution.sendText(phone, message);
}

export function sendMedia(phone, mediaUrl, caption) {
  return provider() === 'waha'
    ? waha.sendMedia(phone, mediaUrl, caption)
    : evolution.sendMedia(phone, mediaUrl, caption);
}
