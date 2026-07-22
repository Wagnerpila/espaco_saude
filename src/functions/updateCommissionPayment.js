import { callFunction } from './_client';

export function updateCommissionPayment(payload) {
  return callFunction('updateCommissionPayment', payload);
}
