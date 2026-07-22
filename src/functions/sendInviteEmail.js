import { callFunction } from './_client';

export function sendInviteEmail(payload) {
  return callFunction('sendInviteEmail', payload);
}
