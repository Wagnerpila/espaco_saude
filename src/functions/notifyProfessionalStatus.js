import { callFunction } from './_client';

export function notifyProfessionalStatus(payload) {
  return callFunction('notifyProfessionalStatus', payload);
}
