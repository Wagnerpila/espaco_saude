import { callFunction } from './_client';

export function listBillingConfirmations() {
  return callFunction('listBillingConfirmations', {});
}

export function confirmBillingReminder(payload) {
  return callFunction('confirmBillingReminder', payload);
}
