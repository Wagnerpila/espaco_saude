import { callFunction } from './_client';

export function sendProfessionalAbsenceNotification(appointmentId) {
  return callFunction('sendProfessionalAbsenceNotification', { appointment_id: appointmentId });
}

export function sendAppointmentCancellationNotification(appointmentId) {
  return callFunction('sendAppointmentCancellationNotification', { appointment_id: appointmentId });
}
