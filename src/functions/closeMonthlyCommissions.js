import { callFunction } from './_client';

export function closeMonthlyCommissions(payload) {
  return callFunction('closeMonthlyCommissions', payload);
}
