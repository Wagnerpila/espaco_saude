import { apiClient } from '@/api/apiClient';

// Mesma assinatura que os componentes já usam vinda do SDK do base44
// (list(sort, limit), filter(query, sort, limit), etc.), agora batendo na
// nossa API REST genérica de entidades (server/src/routes/entities.routes.js).
export function createEntityClient(name) {
  const base = `/entities/${name}`;

  return {
    list: async (sort, limit) => {
      const { data } = await apiClient.post(`${base}/query`, { sort, limit });
      return data;
    },
    filter: async (query = {}, sort, limit) => {
      const { data } = await apiClient.post(`${base}/query`, { filter: query, sort, limit });
      return data;
    },
    get: async (id) => {
      const { data } = await apiClient.get(`${base}/${id}`);
      return data;
    },
    create: async (payload) => {
      const { data } = await apiClient.post(base, payload);
      return data;
    },
    bulkCreate: async (items) => {
      const { data } = await apiClient.post(`${base}/bulk`, items);
      return data;
    },
    update: async (id, payload) => {
      const { data } = await apiClient.put(`${base}/${id}`, payload);
      return data;
    },
    delete: async (id) => {
      const { data } = await apiClient.delete(`${base}/${id}`);
      return data;
    },
  };
}
