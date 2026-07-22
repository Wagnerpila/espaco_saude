import { callFunction } from './_client';

export function generateMonthlyAppointments(payload) {
  return callFunction('generateMonthlyAppointments', payload);
}
