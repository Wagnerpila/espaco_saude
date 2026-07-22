import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck, Webhook, Bot, Calendar, Users, Bell } from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_URL = `${window.location.origin}/api/functions/v1/n8nWebhook`;

const actions = [
  {
    category: "👤 Pacientes",
    color: "bg-green-100 text-green-800",
    items: [
      {
        action: "find_patient_by_cpf",
        desc: "Busca paciente pelo CPF",
        body: { action: "find_patient_by_cpf", cpf: "123.456.789-00" },
        response: `{ found: true, patient: { id, full_name, phone, email, cpf, ... } }`
      },
      {
        action: "register_patient",
        desc: "Cadastra novo paciente",
        body: { action: "register_patient", full_name: "João Silva", cpf: "123.456.789-00", phone: "11999887766", email: "joao@email.com" },
        response: `{ success: true, patient: { id, full_name, ... } }`
      }
    ]
  },
  {
    category: "📅 Agenda",
    color: "bg-blue-100 text-blue-800",
    items: [
      {
        action: "get_professionals",
        desc: "Lista profissionais ativos",
        body: { action: "get_professionals" },
        response: `{ professionals: [{ id, full_name, specialty }] }`
      },
      {
        action: "get_available_slots",
        desc: "Horários livres em uma data",
        body: { action: "get_available_slots", date: "2026-03-20", professional_id: "(opcional)", duration: 60 },
        response: `{ results: [{ professional_id, professional_name, available_slots: ["08:00","09:00",...] }] }`
      },
      {
        action: "check_availability",
        desc: "Verifica se data+hora está livre",
        body: { action: "check_availability", date: "2026-03-20", time: "14:00", professional_id: "(opcional)", duration: 60 },
        response: `{ available: true, suggested_professionals: [...], available_rooms: [...] }`
      },
      {
        action: "create_appointment",
        desc: "Cria um agendamento",
        body: { action: "create_appointment", patient_id: "abc", professional_id: "def", room_id: "ghi", date: "2026-03-20", time: "14:00", service_type: "Pilates", duration: 60, notes: "Via WhatsApp" },
        response: `{ success: true, appointment: {...}, whatsapp_message: "✅ Consulta Confirmada!..." }`
      },
      {
        action: "cancel_appointment",
        desc: "Cancela um agendamento",
        body: { action: "cancel_appointment", appointment_id: "abc", reason: "Paciente não pode comparecer" },
        response: `{ success: true, message: "Consulta cancelada" }`
      }
    ]
  },
  {
    category: "🔔 Lembretes",
    color: "bg-orange-100 text-orange-800",
    items: [
      {
        action: "send_reminders_today",
        desc: "Lista todos os lembretes do dia (n8n envia via WhatsApp)",
        body: { action: "send_reminders_today" },
        response: `{ date: "...", total_appointments: 5, reminders: [{ patient_name, whatsapp_phone, whatsapp_message, whatsapp_url }] }`
      },
      {
        action: "send_single_reminder",
        desc: "Lembrete de agendamento específico",
        body: { action: "send_single_reminder", appointment_id: "abc" },
        response: `{ patient_name, whatsapp_phone, whatsapp_message, whatsapp_url }`
      }
    ]
  }
];

const n8nFlow = `Fluxo sugerido no n8n para agente WhatsApp:

1. TRIGGER: Webhook WhatsApp (Evolution API / Z-API)
   └─ Recebe mensagem do paciente

2. IA (OpenAI / Gemini) — extrai intenção:
   └─ "Quero agendar" / "Meu CPF é..." / "Ver horários"

3. HTTP Request → find_patient_by_cpf
   ├─ Encontrou? → usa patient_id
   └─ Não encontrou? → pergunta dados → register_patient

4. HTTP Request → get_available_slots
   └─ Mostra horários disponíveis ao paciente

5. Paciente escolhe horário →
   HTTP Request → check_availability (confirma)
   HTTP Request → create_appointment ✅

6. Resposta automática com whatsapp_message de confirmação

─── LEMBRETES DIÁRIOS ───────────────────────────
Cron Job (07:00) → HTTP Request → send_reminders_today
└─ Loop → Enviar cada reminder.whatsapp_message via WhatsApp`;

export default function WebhookDocsPage() {
  const [copiedAction, setCopiedAction] = useState(null);
  const [showFlow, setShowFlow] = useState(false);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedAction(key);
    toast.success("Copiado!");
    setTimeout(() => setCopiedAction(null), 2000);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Webhook className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integração n8n / WhatsApp</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Documentação do webhook para agente IA</p>
          </div>
        </div>

        {/* URL */}
        <Card className="border-2 border-indigo-200 dark:border-indigo-800 dark:bg-gray-900">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">URL do Webhook</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm text-indigo-700 dark:text-indigo-300 break-all">
                {WEBHOOK_URL}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(WEBHOOK_URL, 'url')}>
                {copiedAction === 'url' ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Método: <strong>POST</strong> · Header: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">x-webhook-secret: [WEBHOOK_SECRET]</code>
            </p>
          </CardContent>
        </Card>

        {/* n8n Flow */}
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="w-5 h-5 text-purple-600" />
                Fluxo Sugerido — Agente WhatsApp + IA
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowFlow(!showFlow)}>
                {showFlow ? "Ocultar" : "Ver Fluxo"}
              </Button>
            </div>
          </CardHeader>
          {showFlow && (
            <CardContent>
              <div className="relative">
                <pre className="bg-gray-900 dark:bg-black text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {n8nFlow}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                  onClick={() => copy(n8nFlow, 'flow')}
                >
                  {copiedAction === 'flow' ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Actions */}
        {actions.map(group => (
          <div key={group.category}>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3">{group.category}</h2>
            <div className="space-y-3">
              {group.items.map(item => {
                const bodyStr = JSON.stringify(item.body, null, 2);
                return (
                  <Card key={item.action} className="dark:bg-gray-900 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`font-mono text-xs ${group.color}`}>{item.action}</Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => copy(bodyStr, item.action)}>
                          {copiedAction === item.action ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          <span className="ml-1 text-xs">Copiar body</span>
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Request Body:</p>
                          <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-3 overflow-x-auto">{bodyStr}</pre>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Response:</p>
                          <pre className="bg-gray-800 text-blue-300 text-xs rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{item.response}</pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* Config reminder */}
        <Card className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 dark:bg-gray-900">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-1">⚙️ Configuração necessária</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-500">
              Configure a variável de ambiente <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">WEBHOOK_SECRET</code> no painel do Base44 (Dashboard → Code → Secrets) com uma chave secreta segura.
              Use o mesmo valor no header <code>x-webhook-secret</code> das requisições do n8n.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}