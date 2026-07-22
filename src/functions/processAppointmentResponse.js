import { callFunction } from './_client';

// Rota pública no backend (não exige login) — usada pela página
// ConfirmAppointment.jsx, aberta a partir de um link de WhatsApp/email.
export function processAppointmentResponse(payload) {
  return callFunction('processAppointmentResponse', payload);
}
