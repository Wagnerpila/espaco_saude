import { callFunction } from './_client';

// Devolve { list, categories } — ver server/src/functions/whatsappMessageTemplates.js.
export function listWhatsAppMessageTemplates() {
  return callFunction('listWhatsAppMessageTemplates', {});
}

// payload: { key, template, media_url }. `media_url: null` remove uma imagem
// customizada; omitir `template` (ou mandar vazio) restaura o texto padrão.
export function saveWhatsAppMessageTemplate(payload) {
  return callFunction('saveWhatsAppMessageTemplate', payload);
}
