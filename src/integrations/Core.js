import { apiClient } from '@/api/apiClient';

// Substitui base44.integrations.Core.UploadFile — mesma forma de resposta
// ({ file_url }) usada em UserProfileModal.jsx e MedicalRecordForm.jsx.
export async function UploadFile({ file }) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// Usado hoje só por CreditAnalysis.jsx (análise de crédito via LLM com busca
// na internet) — não faz parte das 16 funções portadas do base44 e ainda não
// tem equivalente no backend self-hosted. Falha de forma explícita em vez de
// quebrar o build; revisitar quando a integração Anthropic entrar (Fase 6).
export async function InvokeLLM() {
  throw new Error('InvokeLLM ainda não está disponível nesta versão self-hosted do app.');
}
