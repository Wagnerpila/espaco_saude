import { apiClient } from '@/api/apiClient';

// User é especial (autenticação), por isso não passa pela factory genérica
// de entidades — bate direto nas rotas de /auth/*.
export const User = {
  me: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },
  updateMyUserData: async (payload) => {
    const { data } = await apiClient.patch('/auth/me', payload);
    return data;
  },
  logout: async () => {
    await apiClient.post('/auth/logout');
  },
};
