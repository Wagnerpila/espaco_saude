import { apiClient } from '@/api/apiClient';

// Os componentes existentes leem `response.data.*` (base44 SDK devolvia a
// resposta HTTP crua para chamadas de função, ao contrário das entidades que
// já vêm desembrulhadas) — por isso devolvemos a promise do axios direto.
export function callFunction(name, payload) {
  return apiClient.post(`/functions/${name}`, payload);
}
