import { callFunction } from './_client';

export function sendProfessionalAbsenceNotification(appointmentId) {
  return callFunction('sendProfessionalAbsenceNotification', { appointment_id: appointmentId });
}
