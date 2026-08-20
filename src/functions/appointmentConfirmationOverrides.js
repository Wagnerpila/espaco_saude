import { callFunction } from './_client';

// Devolve { by_specialty, by_professional } — ver
// server/src/functions/appointmentConfirmationOverrides.js.
export function listAppointmentConfirmationOverrides() {
  return callFunction('listAppointmentConfirmationOverrides', {});
}

// payload: { scope: 'specialty'|'professional', scope_value, template, media_url }.
// template/media_url vazios (ou omitidos) removem a personalização daquele
// escopo e voltam a usar o texto/imagem padrão da confirmação.
export function saveAppointmentConfirmationOverride(payload) {
  return callFunction('saveAppointmentConfirmationOverride', payload);
}
