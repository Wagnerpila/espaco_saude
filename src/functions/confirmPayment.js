import { callFunction } from './_client';

export function confirmPayment(payload) {
  return callFunction('confirmPayment', payload);
}
