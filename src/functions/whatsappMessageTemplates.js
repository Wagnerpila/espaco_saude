import { callFunction } from './_client';

export function listWhatsAppMessageTemplates() {
  return callFunction('listWhatsAppMessageTemplates', {});
}

export function saveWhatsAppMessageTemplate(payload) {
  return callFunction('saveWhatsAppMessageTemplate', payload);
}
