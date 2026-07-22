import { callFunction } from './_client';

export function createFinancialTransaction(payload) {
  return callFunction('createFinancialTransaction', payload);
}
