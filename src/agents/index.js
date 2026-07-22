import { apiClient } from '@/api/apiClient';

// Substitui o agentSDK do base44 (AgentChat.jsx / PublicChat.jsx). O backend
// real (POST /api/agent/conversations, .../messages) ainda não existe —
// entra na Fase 6 (agente híbrido com Claude), ver plano de migração. Essa
// implementação já usa a forma final da API para não precisar tocar nos
// componentes de novo quando o backend chegar; até lá, chamadas falham com
// 404 e os componentes já tratam o erro (try/catch existente).
const POLL_INTERVAL_MS = 3000;

export const agentSDK = {
  async createConversation({ agent_name, metadata }) {
    const { data } = await apiClient.post('/agent/conversations', { agent_name, metadata });
    return data;
  },

  async addMessage(conversation, message) {
    const { data } = await apiClient.post(`/agent/conversations/${conversation.id}/messages`, message);
    return data;
  },

  subscribeToConversation(conversationId, onUpdate) {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const { data } = await apiClient.get(`/agent/conversations/${conversationId}`);
        onUpdate(data);
      } catch (_err) {
        // silencioso — próximo poll tenta de novo
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  },
};
