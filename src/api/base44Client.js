import { apiClient } from '@/api/apiClient';
import * as entities from '@/entities/all';
import { User } from '@/entities/User';
import { UploadFile, InvokeLLM } from '@/integrations/Core';

// Compat: vários componentes ainda importam `{ base44 } from "@/api/base44Client"`
// e chamam base44.entities.X / base44.auth.* / base44.integrations.Core.* —
// em vez de reescrever cada um deles, mantemos o mesmo formato de objeto,
// só que apontando para os módulos reais (@/entities, @/integrations)
// batendo na nossa API REST. Ver decisão equivalente para o wire format
// (snake_case) no plano de migração.
export const base44 = {
  entities,
  auth: {
    me: () => User.me(),
    updateMe: (payload) => User.updateMyUserData(payload),
    logout: async (redirectTo) => {
      await User.logout();
      if (redirectTo) window.location.href = redirectTo;
    },
  },
  functions: {
    invoke: (name, payload) => apiClient.post(`/functions/${name}`, payload),
  },
  integrations: {
    Core: { UploadFile, InvokeLLM },
  },
};
