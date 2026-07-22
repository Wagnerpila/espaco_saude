import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCheck, Bot, Workflow, Zap, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_URL = `${window.location.origin}/api/functions/v1/n8nWebhook`;

const AGENT_PROMPT = `Você é um assistente virtual da **Clínica Espaço Saúde**, especializada em Pilates, Fisioterapia e Estética. Seu nome é **Sofia** e você atende pacientes via WhatsApp com simpatia, clareza e agilidade.

## 🎯 SUA MISSÃO
Ajudar pacientes a: agendar consultas, verificar horários disponíveis, cadastrar novos pacientes e enviar confirmações.

## 📋 FLUXO OBRIGATÓRIO DE ATENDIMENTO

### PASSO 1 — Identificação do paciente
Sempre que o paciente iniciar conversa ou pedir agendamento:
1. Pergunte o **CPF** do paciente
2. Chame a ferramenta **find_patient_by_cpf** com o CPF informado
3. Se **encontrado** → siga para o PASSO 2
4. Se **não encontrado** → inicie o PASSO 1B (cadastro)

### PASSO 1B — Cadastro de novo paciente
Colete os seguintes dados **um de cada vez**, em ordem:
- Nome completo
- CPF (já coletado)
- Telefone WhatsApp
- Email (opcional — diga que é opcional)

Após coletar, chame **register_patient** e confirme: *"Cadastro realizado! Agora vamos agendar sua consulta."*

### PASSO 2 — Intenção do paciente
Entenda o que o paciente deseja:
- Agendar nova consulta → PASSO 3
- Cancelar consulta → peça o appointment_id ou data/hora e chame **cancel_appointment**
- Ver horários → PASSO 3A

### PASSO 3 — Agendamento
1. Pergunte qual **data** o paciente prefere (formato: ex. "próxima segunda", "20 de março")
2. Converta para formato **YYYY-MM-DD**
3. Chame **get_available_slots** com a data (sem filtrar por profissional ainda)
4. Mostre os horários disponíveis de forma amigável, ex:
   *"No dia 20/03 temos os seguintes horários livres: 08:00, 09:00, 14:00, 15:00. Qual prefere?"*
5. Paciente escolhe o horário → chame **check_availability** para confirmar
6. Se disponível → PASSO 4
7. Se indisponível → ofereça horários alternativos

### PASSO 4 — Confirmação e agendamento
1. Mostre um resumo para o paciente confirmar:
   *"Vou confirmar: [data] às [hora] com [profissional]. Confirma? (Sim/Não)"*
2. Se confirmar → chame **create_appointment**
3. Use o **whatsapp_message** retornado como resposta final ao paciente
4. Finalize com: *"Qualquer dúvida, é só chamar! Até lá 😊"*

## ⚠️ REGRAS IMPORTANTES
- NUNCA agende sem confirmar disponibilidade via **check_availability**
- NUNCA invente horários — use SEMPRE os dados retornados pelas ferramentas
- Se o paciente não confirmar o CPF corretamente, peça novamente (apenas números)
- Datas relativas ("amanhã", "semana que vem") devem ser convertidas para YYYY-MM-DD antes de chamar as ferramentas
- Sempre use tom amigável, informal e use emojis com moderação
- Se não conseguir realizar uma ação, explique o motivo e ofereça alternativa

## 🛠️ FERRAMENTAS DISPONÍVEIS
- **find_patient_by_cpf** → buscar paciente (params: cpf)
- **register_patient** → cadastrar paciente (params: full_name, cpf, phone, email)
- **get_professionals** → listar profissionais
- **get_available_slots** → horários livres (params: date, professional_id opcional, duration)
- **check_availability** → verificar horário específico (params: date, time, professional_id)
- **create_appointment** → criar agendamento (params: patient_id, professional_id, room_id, date, time, service_type, notes)
- **cancel_appointment** → cancelar (params: appointment_id, reason)

## 💬 EXEMPLOS DE RESPOSTAS
- Saudação: *"Olá! 😊 Sou a Sofia da Clínica Espaço Saúde. Para te ajudar, pode me informar seu CPF (só os números)?"*
- Horários: *"Temos disponibilidade no dia 20/03 nos horários: 08h, 10h e 14h. Qual prefere?"*
- Confirmação: *"Perfeito! Agendei para você: Sexta-feira, 20/03 às 14h com Dra. Ana. ✅"*
- Sem horários: *"Poxa, neste dia não há horários disponíveis. Que tal o dia seguinte? 😊"*`;

const steps = [
  {
    id: 1,
    title: "Trigger — WhatsApp (Evolution API ou Z-API)",
    icon: "📲",
    color: "border-green-400",
    badge: "Trigger",
    badgeColor: "bg-green-100 text-green-800",
    desc: "Nó que recebe as mensagens dos pacientes via WhatsApp.",
    config: [
      { label: "Tipo de nó", value: "Webhook (HTTP)" },
      { label: "Método", value: "POST" },
      { label: "Path", value: "/whatsapp-recebido" },
      { label: "Authentication", value: "None (ou Header Auth se preferir)" },
    ],
    note: "Configure no Evolution API/Z-API o webhook apontando para a URL deste nó. A mensagem do paciente estará em: body.data.message.conversation (Evolution) ou body.text (Z-API)."
  },
  {
    id: 2,
    title: "Set — Extrair dados da mensagem",
    icon: "⚙️",
    color: "border-blue-400",
    badge: "Set",
    badgeColor: "bg-blue-100 text-blue-800",
    desc: "Normaliza os dados recebidos do WhatsApp.",
    config: [
      { label: "phone", value: "{{ $json.body.data.from }} (ou campo equivalente da sua API)" },
      { label: "message", value: "{{ $json.body.data.message.conversation }}" },
      { label: "session_id", value: "{{ $json.body.data.from }}" },
    ],
    note: "Adapte os campos conforme sua API WhatsApp. O session_id é usado para memória de contexto — use o número do paciente."
  },
  {
    id: 3,
    title: "AI Agent — Agente com ferramentas HTTP",
    icon: "🤖",
    color: "border-purple-400",
    badge: "AI Agent",
    badgeColor: "bg-purple-100 text-purple-800",
    desc: "Cérebro do fluxo. Processa a mensagem e decide quais ferramentas chamar.",
    config: [
      { label: "Chat Model", value: "OpenAI GPT-4o ou Google Gemini 1.5 Pro" },
      { label: "Memory", value: "Window Buffer Memory (Session ID: {{ $('Set').item.json.session_id }})" },
      { label: "Source for Prompt", value: "Define below" },
      { label: "Prompt (User Message)", value: "{{ $('Set').item.json.message }}" },
      { label: "System Prompt", value: "⬇️ Cole o prompt completo abaixo" },
    ],
    note: "No campo System Message (aba Options → System Message), cole o prompt completo da Sofia."
  },
  {
    id: 4,
    title: "HTTP Tool — find_patient_by_cpf",
    icon: "🔍",
    color: "border-yellow-400",
    badge: "Tool (HTTP)",
    badgeColor: "bg-yellow-100 text-yellow-800",
    desc: "Ferramenta usada pelo agente para buscar paciente pelo CPF.",
    config: [
      { label: "Tool Name", value: "find_patient_by_cpf" },
      { label: "Description", value: "Busca um paciente pelo CPF no sistema da clínica. Retorna os dados do paciente se encontrado." },
      { label: "Method", value: "POST" },
      { label: "URL", value: WEBHOOK_URL },
      { label: "Header: x-webhook-secret", value: "[seu WEBHOOK_SECRET]" },
      { label: "Body (JSON)", value: '{ "action": "find_patient_by_cpf", "cpf": "{cpf}" }' },
      { label: "cpf (parâmetro)", value: "string — CPF do paciente" },
    ],
    note: "Adicione como sub-nó do AI Agent (arraste para a porta Tool). Repita este padrão para todas as ferramentas abaixo."
  },
  {
    id: 5,
    title: "HTTP Tool — register_patient",
    icon: "📝",
    color: "border-yellow-400",
    badge: "Tool (HTTP)",
    badgeColor: "bg-yellow-100 text-yellow-800",
    desc: "Cadastra novo paciente no sistema.",
    config: [
      { label: "Tool Name", value: "register_patient" },
      { label: "Description", value: "Cadastra um novo paciente no sistema. Use quando o CPF não for encontrado." },
      { label: "Method", value: "POST" },
      { label: "URL", value: WEBHOOK_URL },
      { label: "Header: x-webhook-secret", value: "[seu WEBHOOK_SECRET]" },
      { label: "Body (JSON)", value: '{ "action": "register_patient", "full_name": "{full_name}", "cpf": "{cpf}", "phone": "{phone}", "email": "{email}" }' },
      { label: "Parâmetros", value: "full_name (string), cpf (string), phone (string), email (string, opcional)" },
    ]
  },
  {
    id: 6,
    title: "HTTP Tool — get_available_slots",
    icon: "📅",
    color: "border-yellow-400",
    badge: "Tool (HTTP)",
    badgeColor: "bg-yellow-100 text-yellow-800",
    desc: "Retorna os horários disponíveis em uma data.",
    config: [
      { label: "Tool Name", value: "get_available_slots" },
      { label: "Description", value: "Retorna os horários disponíveis de agendamento para uma data específica. Retorna profissionais e horários livres." },
      { label: "Method", value: "POST" },
      { label: "URL", value: WEBHOOK_URL },
      { label: "Body (JSON)", value: '{ "action": "get_available_slots", "date": "{date}", "duration": 60 }' },
      { label: "Parâmetros", value: "date (string YYYY-MM-DD), duration (number, padrão 60)" },
    ]
  },
  {
    id: 7,
    title: "HTTP Tool — check_availability",
    icon: "✅",
    color: "border-yellow-400",
    badge: "Tool (HTTP)",
    badgeColor: "bg-yellow-100 text-yellow-800",
    desc: "Verifica se um horário específico está disponível.",
    config: [
      { label: "Tool Name", value: "check_availability" },
      { label: "Description", value: "Verifica se uma data e horário específico estão disponíveis. Retorna profissionais e salas disponíveis." },
      { label: "Method", value: "POST" },
      { label: "URL", value: WEBHOOK_URL },
      { label: "Body (JSON)", value: '{ "action": "check_availability", "date": "{date}", "time": "{time}", "duration": 60 }' },
      { label: "Parâmetros", value: "date (YYYY-MM-DD), time (HH:MM), duration (number)" },
    ]
  },
  {
    id: 8,
    title: "HTTP Tool — create_appointment",
    icon: "📌",
    color: "border-yellow-400",
    badge: "Tool (HTTP)",
    badgeColor: "bg-yellow-100 text-yellow-800",
    desc: "Cria o agendamento após confirmação do paciente.",
    config: [
      { label: "Tool Name", value: "create_appointment" },
      { label: "Description", value: "Cria um agendamento no sistema. Use apenas após o paciente confirmar data, hora e profissional." },
      { label: "Method", value: "POST" },
      { label: "URL", value: WEBHOOK_URL },
      { label: "Body (JSON)", value: '{ "action": "create_appointment", "patient_id": "{patient_id}", "professional_id": "{professional_id}", "room_id": "{room_id}", "date": "{date}", "time": "{time}", "service_type": "{service_type}", "notes": "Agendado via WhatsApp" }' },
      { label: "Parâmetros", value: "patient_id, professional_id, room_id, date (YYYY-MM-DD), time (HH:MM), service_type (string)" },
    ]
  },
  {
    id: 9,
    title: "HTTP Tool — cancel_appointment",
    icon: "❌",
    color: "border-red-300",
    badge: "Tool (HTTP)",
    badgeColor: "bg-red-100 text-red-700",
    desc: "Cancela um agendamento a pedido do paciente.",
    config: [
      { label: "Tool Name", value: "cancel_appointment" },
      { label: "Description", value: "Cancela um agendamento existente." },
      { label: "Method", value: "POST" },
      { label: "URL", value: WEBHOOK_URL },
      { label: "Body (JSON)", value: '{ "action": "cancel_appointment", "appointment_id": "{appointment_id}", "reason": "{reason}" }' },
      { label: "Parâmetros", value: "appointment_id (string), reason (string, opcional)" },
    ]
  },
  {
    id: 10,
    title: "HTTP Request — Enviar resposta ao WhatsApp",
    icon: "📤",
    color: "border-green-400",
    badge: "HTTP Request",
    badgeColor: "bg-green-100 text-green-800",
    desc: "Envia a resposta gerada pelo agente de volta ao paciente via WhatsApp.",
    config: [
      { label: "Method", value: "POST" },
      { label: "URL (Evolution API)", value: "http://[seu-servidor]:8080/message/sendText/[instancia]" },
      { label: "Header: apikey", value: "[sua API key do Evolution]" },
      { label: "Body (JSON)", value: '{ "number": "{{ $("Set").item.json.phone }}", "textMessage": { "text": "{{ $json.output }}" } }' },
    ],
    note: "O campo {{ $json.output }} contém a resposta final do AI Agent. Adapte a URL e campos conforme sua API WhatsApp (Z-API, Evolution, WPPConnect, etc)."
  },
  {
    id: 11,
    title: "(Opcional) Cron — Lembretes Diários",
    icon: "⏰",
    color: "border-orange-400",
    badge: "Cron",
    badgeColor: "bg-orange-100 text-orange-800",
    desc: "Fluxo separado para enviar lembretes automaticamente todo dia às 07h.",
    config: [
      { label: "Tipo", value: "Schedule Trigger" },
      { label: "Regra", value: "Diário às 07:00 (horário de Brasília)" },
      { label: "Próximo nó", value: "HTTP Request → POST " + WEBHOOK_URL },
      { label: "Body", value: '{ "action": "send_reminders_today" }' },
      { label: "Após receber", value: "Loop over items → Enviar cada reminder.whatsapp_message via WhatsApp" },
    ],
    note: "Crie um fluxo n8n separado só para lembretes. O webhook retorna uma lista de objetos com whatsapp_phone e whatsapp_message. Use o nó Split in Batches ou Loop para enviar cada um."
  }
];

function StepCard({ step }) {
  const [open, setOpen] = useState(step.id <= 3);
  return (
    <Card className={`border-l-4 ${step.color} dark:bg-gray-900 dark:border-r-gray-700 dark:border-t-gray-700 dark:border-b-gray-700`}>
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{step.icon}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Nó {step.id}</span>
                  <Badge className={step.badgeColor}>{step.badge}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
              </div>
            </div>
            {open ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-2">
            {step.config.map((c, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400 sm:w-48 flex-shrink-0">{c.label}:</span>
                <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded text-xs break-all">{c.value}</code>
              </div>
            ))}
          </div>
          {step.note && (
            <div className="mt-4 flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-400">{step.note}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function N8nTutorialPage() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(AGENT_PROMPT);
    setCopiedPrompt(true);
    toast.success("Prompt copiado!");
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tutorial — Agente IA no n8n</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Prompt da Sofia + passo a passo completo do fluxo</p>
          </div>
        </div>

        {/* Diagrama resumo */}
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Visão Geral do Fluxo</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {["📲 WhatsApp", "⚙️ Set", "🤖 AI Agent", "🛠️ HTTP Tools (×6)", "📤 Responder"].map((s, i, arr) => (
                <React.Fragment key={s}>
                  <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-medium text-gray-700 dark:text-gray-300">{s}</span>
                  {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prompt */}
        <Card className="border-2 border-purple-300 dark:border-purple-700 dark:bg-gray-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                Prompt do Agente IA — "Sofia"
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPrompt(!showPrompt)}>
                  {showPrompt ? "Ocultar" : "Ver Prompt"}
                </Button>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={copyPrompt}>
                  {copiedPrompt ? <CheckCheck className="w-4 h-4 mr-1 text-green-300" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copiedPrompt ? "Copiado!" : "Copiar Prompt"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cole este prompt no campo <strong>System Message</strong> do nó AI Agent no n8n.</p>
          </CardHeader>
          {showPrompt && (
            <CardContent>
              <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {AGENT_PROMPT}
              </pre>
            </CardContent>
          )}
        </Card>

        {/* Onde colar */}
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 dark:bg-gray-900">
          <CardContent className="p-4">
            <p className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">📍 Onde colar o prompt no n8n?</p>
            <ol className="text-sm text-yellow-700 dark:text-yellow-500 space-y-1 list-decimal list-inside">
              <li>Abra o nó <strong>AI Agent</strong></li>
              <li>Vá em <strong>Options → Add Option → System Message</strong></li>
              <li>Cole o prompt completo no campo que aparecer</li>
              <li>No campo <strong>Prompt (User Message)</strong> coloque: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{"{{ $('Set').item.json.message }}"}</code></li>
            </ol>
          </CardContent>
        </Card>

        {/* Steps */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Passo a passo — Criação dos nós no n8n
          </h2>
          <div className="space-y-3">
            {steps.map(step => <StepCard key={step.id} step={step} />)}
          </div>
        </div>

        {/* Erros comuns */}
        <Card className="border-2 border-red-300 dark:border-red-700 dark:bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700 dark:text-red-400 flex items-center gap-2">
              ⚠️ Erros Comuns — Corrija antes de testar!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">

            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
              <p className="font-bold text-red-800 dark:text-red-400">❌ Erro 1 — Nó errado: você está usando HTTP Request normal</p>
              <p className="text-red-700 dark:text-red-500">Você criou um nó <strong>HTTP Request</strong> comum (ícone de globo azul). O correto é usar o nó <strong>HTTP Request Tool</strong>, que fica dentro da categoria <strong>AI → Tools</strong>. Ele tem aparência diferente e deve ser conectado diretamente na <strong>porta "Tool"</strong> do AI Agent, não em sequência no fluxo.</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="px-3 py-1.5 bg-red-100 dark:bg-red-900 rounded text-red-700 dark:text-red-400 text-xs font-medium">❌ HTTP Request (nó comum)</div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900 rounded text-green-700 dark:text-green-400 text-xs font-medium">✅ HTTP Request Tool (AI → Tools)</div>
              </div>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
              <p className="font-bold text-red-800 dark:text-red-400">❌ Erro 2 — CPF no Query Parameter em vez do Body</p>
              <p className="text-red-700 dark:text-red-500">Você adicionou o CPF como <strong>Query Parameter</strong> (aparece na URL como <code className="bg-red-100 dark:bg-red-900 px-1 rounded">?cpf=...</code>). O webhook espera os dados no <strong>Body JSON</strong>. Remova o Query Parameter e deixe os dados no Body:</p>
              <code className="block bg-gray-900 text-green-300 text-xs p-2 rounded mt-1">{"{ \"action\": \"find_patient_by_cpf\", \"cpf\": \"{cpf}\" }"}</code>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
              <p className="font-bold text-red-800 dark:text-red-400">❌ Erro 3 — Nome do header com dois-pontos</p>
              <p className="text-red-700 dark:text-red-500">No campo Name do header você digitou <code className="bg-red-100 dark:bg-red-900 px-1 rounded">x-webhook-secret<strong>:</strong></code> (com dois-pontos no final). O correto é sem dois-pontos:</p>
              <div className="flex items-center gap-3 mt-1">
                <code className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400 px-2 py-0.5 rounded text-xs">x-webhook-secret:</code>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs">x-webhook-secret</code>
              </div>
            </div>

            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-2">
              <p className="font-bold text-orange-800 dark:text-orange-400">⚠️ Como conectar o HTTP Tool ao AI Agent corretamente</p>
              <ol className="text-orange-700 dark:text-orange-500 space-y-1 list-decimal list-inside">
                <li>No n8n, pesquise por <strong>"HTTP Request Tool"</strong> (não HTTP Request comum)</li>
                <li>Configure Method, URL, Headers e Body normalmente</li>
                <li>Na aba <strong>Parameters</strong> do HTTP Tool, adicione os parâmetros que o agente vai preencher (ex: <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">cpf</code>)</li>
                <li>Arraste o fio do HTTP Tool para a <strong>porta "Tool" (ícone de chave)</strong> na parte inferior do AI Agent</li>
                <li>O nó deve aparecer como sub-nó <strong>abaixo</strong> do AI Agent, não ao lado</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Dicas finais */}
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-base">💡 Dicas Finais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• <strong className="text-gray-900 dark:text-white">Memória:</strong> Use <em>Window Buffer Memory</em> com Session ID baseado no número do WhatsApp para manter contexto da conversa.</p>
            <p>• <strong className="text-gray-900 dark:text-white">Modelo recomendado:</strong> GPT-4o para melhor interpretação ou Gemini 1.5 Pro (mais barato).</p>
            <p>• <strong className="text-gray-900 dark:text-white">Erro de ferramenta:</strong> Adicione um nó <em>Error Trigger</em> para capturar falhas e enviar mensagem padrão ao paciente.</p>
            <p>• <strong className="text-gray-900 dark:text-white">Teste:</strong> Use o botão "Execute step" em cada nó individualmente antes de ativar o fluxo completo.</p>
            <p>• <strong className="text-gray-900 dark:text-white">WEBHOOK_SECRET:</strong> Configure no n8n como <em>Credential → Header Auth → x-webhook-secret</em>.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}