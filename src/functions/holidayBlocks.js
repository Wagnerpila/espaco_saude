import { callFunction } from './_client';

export function blockAllProfessionalsForHolidays() {
  return callFunction('blockAllProfessionalsForHolidays', {});
}

export function listHolidayConflicts() {
  return callFunction('listHolidayConflicts', {});
}

export function cancelHolidayConflict(payload) {
  return callFunction('cancelHolidayConflict', payload);
}
