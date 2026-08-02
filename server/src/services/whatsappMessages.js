import { prisma } from '../db.js';

// Textos padrão de todas as respostas do bot de WhatsApp (server/src/services/whatsappBot.js).
// Cada chave pode ser sobrescrita pelo admin (tabela whatsapp_message_templates,
// ver server/src/functions/whatsappMessageTemplates.js) — sem override, usa o
// texto daqui. `{{variavel}}` é substituído em tempo de execução (ver renderTemplate).
export const DEFAULT_TEMPLATES = {
  MENU_OPTIONS: {
    description: 'Lista de opções do menu principal',
    template: '👇 *Digite o número da opção desejada:*\n\n1️⃣ Agendar consulta\n2️⃣ Cancelar consulta\n3️⃣ Informações sobre serviços\n4️⃣ Falar com atendente',
  },
  GREETING_MENU: {
    description: 'Saudação ao detectar "oi/olá/bom dia..." fora do menu',
    template: 'Olá{{first_name}}! 👋 Bem-vindo(a) à Clínica Espaço Saúde.\n\nO que deseja fazer?\n\n{{menu}}',
  },
  MENU: {
    description: 'Mensagem inicial ao entrar no estado MENU',
    template: 'Olá{{first_name}}! 👋 Bem-vindo(a) à Clínica Espaço Saúde.\n\n{{menu}}',
  },
  MENU_INVALID: {
    description: 'Opção do menu principal não reconhecida',
    template: '⚠️ Opção não reconhecida.\n\n{{menu}}',
  },
  DEFAULT_FALLBACK: {
    description: 'Estado desconhecido/expirado — reinicia o atendimento',
    template: 'Olá{{first_name}}! 👋\n\n{{menu}}',
  },
  ASK_CPF_TO_CANCEL: {
    description: 'Pede o CPF para identificar quem quer cancelar (sem cadastro salvo pelo telefone)',
    template: 'Para cancelar, preciso identificar você.\n\n👇 *Digite seu CPF* (apenas números):',
  },
  NO_APPOINTMENTS_TO_CANCEL: {
    description: 'Paciente não tem consultas futuras para cancelar',
    template: 'Você não possui consultas futuras para cancelar.\n\n👇 *Digite menu* para voltar ao início.',
  },
  CHOOSE_APPOINTMENT_TO_CANCEL: {
    description: 'Lista de consultas futuras para escolher qual cancelar',
    template: 'Qual consulta deseja cancelar?\n\n{{list}}\n\n👇 *Digite o número da consulta* que deseja cancelar:',
  },
  SERVICES_INFO: {
    description: 'Resposta da opção "3 - Informações sobre serviços"',
    template: 'Nossos serviços:\n\n💆 *Estética* - Tratamentos faciais e corporais\n🦴 *Fisioterapia* - Ortopédica e neurológica\n🧘 *Pilates* - Equipamento e solo\n\n⏰ Horários:\nSeg-Sex: 08h às 18h\nSáb: 08h às 12h\n\n👇 *Digite 1* para agendar ou *menu* para voltar ao início.',
  },
  TRANSFER_TO_ATTENDANT: {
    description: 'Resposta da opção "4 - Falar com atendente"',
    template: 'Encaminhando para atendente... 📞\n\nEm breve alguém entrará em contato.\n\n👇 *Digite menu* para voltar ao início.',
  },
  CHOOSE_PROFESSIONAL: {
    description: 'Lista de profissionais para escolher ao agendar',
    template: 'Ótimo! Escolha o profissional:\n\n{{list}}\n\n👇 *Digite o número do profissional desejado:*',
  },
  INVALID_PROFESSIONAL_CHOICE: {
    description: 'Número de profissional inválido',
    template: '⚠️ Opção inválida.\n\n{{list}}\n\n👇 *Digite o número* do profissional desejado:',
  },
  PROFESSIONAL_SELECTED: {
    description: 'Confirma o profissional escolhido e pede a data',
    template: 'Ótimo! *{{professional_name}}* selecionado. ✅\n\n👇 *Digite a data* que preferir no formato *DD/MM/AAAA*\n\nExemplo: 15/05/2026',
  },
  INVALID_DATE_FORMAT: {
    description: 'Data digitada em formato inválido',
    template: '⚠️ Data inválida.\n\n👇 *Digite a data* no formato *DD/MM/AAAA*\n\nExemplo: 15/05/2026',
  },
  DATE_IN_PAST: {
    description: 'Data digitada já passou',
    template: '⚠️ Esta data já passou.\n\n👇 *Digite uma data futura* no formato *DD/MM/AAAA*',
  },
  CLOSED_SUNDAY: {
    description: 'Clínica fechada aos domingos',
    template: 'Aos domingos estamos fechados. 🔒\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*',
  },
  PROFESSIONAL_NOT_AVAILABLE_WEEKDAY: {
    description: 'Profissional não atende no dia da semana escolhido',
    template: '{{professional_name}} não atende às {{day_name}}s. 🔒\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*',
  },
  PROFESSIONAL_BLOCKED_DATE: {
    description: 'Data bloqueada (feriado/bloqueio de agenda) para o profissional',
    template: '{{professional_name}} não está disponível em *{{date}}* (feriado ou bloqueio de agenda).\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*',
  },
  NO_SLOTS_AVAILABLE: {
    description: 'Nenhum horário livre na data escolhida',
    template: 'Não há horários disponíveis em *{{date}}* com {{professional_name}}.\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*',
  },
  SLOTS_AVAILABLE: {
    description: 'Lista de horários livres na data escolhida',
    template: 'Horários disponíveis em *{{date}}* com {{professional_name}}:\n\n{{list}}\n\n_(Expediente: {{start}} às {{end}})_\n\n👇 *Digite o número* do horário desejado:',
  },
  INVALID_SLOT_CHOICE: {
    description: 'Número de horário inválido',
    template: '⚠️ Opção inválida.\n\n{{list}}\n\n👇 *Digite o número* do horário desejado:',
  },
  FOUND_REGISTRATION: {
    description: 'Cadastro encontrado pelo telefone — confirma dados',
    template: 'Encontrei seu cadastro! ✅\n\n👤 *{{patient_name}}*\n📱 {{patient_phone}}\n\nSeus dados estão corretos?\n\n1️⃣ Sim, estão corretos\n2️⃣ Não, quero usar outros dados\n\n👇 *Digite 1 ou 2:*',
  },
  NOT_FOUND_QUICK_REGISTER: {
    description: 'Cadastro não encontrado — inicia cadastro rápido (nome)',
    template: 'Não encontrei seu cadastro no sistema. Vou fazer um cadastro rápido! 📋\n\n*Passo 1 de 3*\n👇 *Digite seu nome completo:*',
  },
  CONFIRM_APPOINTMENT_SUMMARY: {
    description: 'Resumo do agendamento antes de confirmar (com "Perfeito!")',
    template: 'Perfeito! Confirme o agendamento:\n\n📅 *Data:* {{date}}\n⏰ *Horário:* {{time}}\n👨‍⚕️ *Profissional:* {{professional_name}}\n👤 *Paciente:* {{patient_name}}\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar\n\n👇 *Digite 1 para confirmar ou 2 para cancelar:*',
  },
  CONFIRM_APPOINTMENT_SUMMARY_PLAIN: {
    description: 'Resumo do agendamento antes de confirmar (sem "Perfeito!")',
    template: 'Confirme o agendamento:\n\n📅 *Data:* {{date}}\n⏰ *Horário:* {{time}}\n👨‍⚕️ *Profissional:* {{professional_name}}\n👤 *Paciente:* {{patient_name}}\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar\n\n👇 *Digite 1 para confirmar ou 2 para cancelar:*',
  },
  USE_OTHER_DATA: {
    description: 'Paciente optou por usar outros dados (não é ele no cadastro)',
    template: 'Ok! Vamos usar outros dados.\n\n*Passo 1 de 3*\n👇 *Digite seu nome completo:*',
  },
  ASK_1_OR_2_CORRECT_DATA: {
    description: 'Repete pergunta 1/2 sobre dados corretos',
    template: '👇 *Digite 1 ou 2:*\n\n1️⃣ Sim, meus dados estão corretos\n2️⃣ Não, quero usar outros dados',
  },
  NAME_TOO_SHORT: {
    description: 'Nome digitado é curto demais',
    template: '⚠️ Nome muito curto. Por favor informe seu nome completo.\n\n👇 *Digite seu nome completo:*',
  },
  FOUND_SIMILAR_NAME: {
    description: 'Encontrado um cadastro com nome parecido',
    template: 'Encontrei um cadastro com nome similar:\n\n👤 *{{found_name}}*\n\nÉ você?\n\n1️⃣ Sim, sou eu\n2️⃣ Não, sou outra pessoa\n\n👇 *Digite 1 ou 2:*',
  },
  NAME_REGISTERED_ASK_CPF: {
    description: 'Nome registrado, pede CPF (passo 2/3 do cadastro rápido)',
    template: '✅ Nome registrado: *{{patient_name}}*\n\n*Passo 2 de 3*\n👇 *Digite seu CPF* (somente números, 11 dígitos):\n\nExemplo: 12345678900',
  },
  CONTINUE_REGISTER_ASK_CPF: {
    description: 'Continua cadastro pedindo CPF (após dizer "não sou eu")',
    template: 'Ok! Vamos continuar seu cadastro.\n\n*Passo 2 de 3*\n👇 *Digite seu CPF* (somente números, 11 dígitos):\n\nExemplo: 12345678900',
  },
  ASK_1_OR_2_IS_YOU: {
    description: 'Repete pergunta 1/2 sobre "é você?"',
    template: '👇 *Digite 1 ou 2:*\n\n1️⃣ Sim, sou eu\n2️⃣ Não, sou outra pessoa',
  },
  INVALID_CPF: {
    description: 'CPF digitado não tem 11 dígitos',
    template: '⚠️ CPF inválido. Precisa ter 11 dígitos.\n\n👇 *Digite seu CPF* (somente números):\n\nExemplo: 12345678900',
  },
  CPF_FOUND_CONFIRM: {
    description: 'CPF já cadastrado — confirma agendamento direto',
    template: '✅ CPF encontrado! Cadastro localizado:\n\n👤 *{{patient_name}}*\n\nConfirme o agendamento:\n\n📅 *Data:* {{date}}\n⏰ *Horário:* {{time}}\n👨‍⚕️ *Profissional:* {{professional_name}}\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar\n\n👇 *Digite 1 para confirmar ou 2 para cancelar:*',
  },
  CPF_REGISTERED_ASK_BIRTH: {
    description: 'CPF registrado, pede data de nascimento (passo 3/3)',
    template: '✅ CPF registrado.\n\n*Passo 3 de 3*\n👇 *Digite sua data de nascimento* no formato *DD/MM/AAAA*:\n\nExemplo: 15/03/1990',
  },
  INVALID_BIRTH_DATE: {
    description: 'Data de nascimento em formato inválido',
    template: '⚠️ Data inválida.\n\n👇 *Digite sua data de nascimento* no formato *DD/MM/AAAA*:\n\nExemplo: 15/03/1990',
  },
  REGISTRATION_SUMMARY_CONFIRM: {
    description: 'Resumo do cadastro rápido antes de confirmar',
    template: '✅ Cadastro quase pronto!\n\nResumo dos seus dados:\n👤 *Nome:* {{patient_name}}\n🪪 *CPF:* {{patient_cpf}}\n🎂 *Nascimento:* {{birth_date}}\n\nSeus dados estão corretos?\n\n1️⃣ ✅ Sim, continuar\n2️⃣ ✏️ Corrigir dados\n\n👇 *Digite 1 para continuar ou 2 para corrigir:*',
  },
  CORRECT_DATA_RESTART: {
    description: 'Reinicia o cadastro rápido para corrigir dados',
    template: 'Ok! Vamos corrigir.\n\n*Passo 1 de 3*\n👇 *Digite seu nome completo:*',
  },
  ASK_1_OR_2_CONTINUE_OR_CORRECT: {
    description: 'Repete pergunta 1/2 sobre continuar ou corrigir cadastro',
    template: '👇 *Digite 1 ou 2:*\n\n1️⃣ ✅ Sim, continuar\n2️⃣ ✏️ Corrigir dados',
  },
  APPOINTMENT_CONFIRMED: {
    description: 'Agendamento confirmado com sucesso (mensagem final)',
    template: '✅ *Agendamento confirmado com sucesso!*\n\n📅 *Data:* {{date}}\n⏰ *Horário:* {{time}}\n👨‍⚕️ *Profissional:* {{professional_name}}\n👤 *Paciente:* {{patient_name}}\n\nAté lá! 💙\n\n👇 *Digite menu* para voltar ao início.',
  },
  APPOINTMENT_CANCELLED_BY_USER: {
    description: 'Paciente cancelou o agendamento antes de confirmar (escolheu opção 2)',
    template: 'Agendamento cancelado. ❌\n\n👇 *Digite menu* para voltar ao início.',
  },
  ASK_1_OR_2_CONFIRM_OR_CANCEL: {
    description: 'Repete pergunta 1/2 para confirmar ou cancelar agendamento',
    template: '👇 *Digite 1 para confirmar ou 2 para cancelar:*\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar',
  },
  INVALID_CANCEL_APPOINTMENT_CHOICE: {
    description: 'Número inválido ao escolher qual consulta cancelar',
    template: '⚠️ Opção inválida.\n\n👇 *Digite o número* da consulta que deseja cancelar:',
  },
  APPOINTMENT_CANCELLED_SUCCESS: {
    description: 'Consulta cancelada com sucesso',
    template: '✅ Consulta cancelada com sucesso.\n\n👇 *Digite menu* para voltar ao início.',
  },
  CPF_NOT_FOUND: {
    description: 'CPF não encontrado ao tentar cancelar por CPF',
    template: 'CPF não encontrado. Verifique e tente novamente.\n\n👇 *Digite seu CPF* ou *menu* para voltar:',
  },
  LIST_ITEM_PROFESSIONAL: {
    description: 'Formato de cada linha na lista de profissionais',
    template: '{{i}}️⃣ {{name}} - {{specialty}}',
  },
  LIST_ITEM_APPOINTMENT: {
    description: 'Formato de cada linha na lista de consultas (cancelamento)',
    template: '{{i}}️⃣ {{date}} às {{time}} com {{professional_name}}',
  },
  LIST_ITEM_SLOT: {
    description: 'Formato de cada linha na lista de horários disponíveis',
    template: '{{i}}️⃣ {{time}}',
  },

  // ─────────────────────────────────────────────────────────────
  // Notificações proativas (fora da conversa do bot) — disparadas por
  // eventos do sistema (agendamento confirmado, pagamento confirmado,
  // lembretes automáticos). Ver services/appointmentNotifications.js,
  // services/receipts.js e functions/dailyNotifications.js.
  // ─────────────────────────────────────────────────────────────
  APPOINTMENT_CONFIRMATION_NOTIFICATION: {
    description: 'Confirmação de agendamento enviada ao paciente (bot ou admin confirmando manualmente)',
    template: '✅ *Agendamento Confirmado!*\n━━━━━━━━━━━━━━━━━━━━\n🏥 *Clínica Espaço Saúde*\n\nOlá, {{patient_name}}! 👋\n{{appointment_article}} {{appointment_noun}} foi {{appointment_confirmed}}:\n\n📅 *Data:* {{date}}\n⏰ *Horário:* {{time}}\n{{professional_line}}{{service_line}}\nTe esperamos! 💙\n━━━━━━━━━━━━━━━━━━━━',
  },
  APPOINTMENT_REMINDER_1H: {
    description: 'Lembrete automático enviado 1h antes da consulta',
    template: '⏰ *{{appointment_article}} {{appointment_noun}} é daqui a 1 hora!*\n\nOlá, {{patient_name}}! 👋\nHorário: *{{time}}*\n{{professional_line}}\nTe esperamos na Clínica Espaço Saúde 💙',
  },
  PAYMENT_RECEIPT: {
    description: 'Comprovante de pagamento enviado quando uma transação é confirmada como paga',
    template: '🧾 *Comprovante de Pagamento*\n━━━━━━━━━━━━━━━━━━━━\n🏥 *Clínica Espaço Saúde*\nEstética • Fisioterapia • Pilates\n\nNº {{receipt_number}}\n📅 Data: {{date}}\n\n👤 *Paciente:* {{patient_name}}\n{{professional_line}}🏷️ *Serviço:* {{service}}\n💳 *Pagamento:* {{payment_method}}\n\n✅ *Valor pago: R$ {{amount}}*\n\nObrigado pela preferência! 💙\n━━━━━━━━━━━━━━━━━━━━',
  },
  DAILY_APPOINTMENT_REMINDER: {
    description: 'Lembrete diário (manhã) de consulta marcada para hoje',
    template: '🔔 *Lembrete - Clínica Espaço Saúde*\n\nOlá, {{patient_name}}! 👋\nVocê tem {{appointment_article_indef}} {{appointment_noun}} *hoje*:\n\n⏰ *Horário:* {{time}}\n👨‍⚕️ *Profissional:* {{professional_name}}\n{{service_line}}\n📍 Não esqueça de comparecer no horário marcado.\nPara cancelar ou reagendar, responda esta mensagem.\n\nClínica Espaço Saúde 💙',
  },
  PENDING_PAYMENT_REMINDER: {
    description: 'Lembrete diário de pagamento(s) vencido(s)',
    template: '💳 *Lembrete de Pagamento Vencido*\n\nOlá, {{patient_name}}! 👋\nVocê possui pagamento(s) *vencido(s)* na Clínica Espaço Saúde:\n\n{{items_list}}\n\n💰 *Total vencido: R$ {{total}}*\n\nEntre em contato ou compareça à clínica para regularizar.\nClínica Espaço Saúde 💙',
  },
  PROFESSIONAL_ABSENCE_NOTIFICATION: {
    description: 'Avisa o paciente que o agendamento foi cancelado por ausência do profissional',
    template: '⚠️ *Aviso de Cancelamento*\n━━━━━━━━━━━━━━━━━━━━\n🏥 *Clínica Espaço Saúde*\n\nOlá, {{patient_name}}! 👋\nInfelizmente seu horário do dia *{{date}}* às *{{time}}*{{professional_line}} precisou ser cancelado porque o profissional não poderá atender.\n\nPor favor, entre em contato com a clínica para reagendar. 🙏\n━━━━━━━━━━━━━━━━━━━━',
  },
  HOLIDAY_CLOSURE_NOTIFICATION: {
    description: 'Avisa o paciente que o agendamento foi cancelado por a clínica estar fechada no feriado',
    template: '⚠️ *Aviso de Cancelamento*\n━━━━━━━━━━━━━━━━━━━━\n🏥 *Clínica Espaço Saúde*\n\nOlá, {{patient_name}}! 👋\nSeu horário do dia *{{date}}* às *{{time}}* precisou ser cancelado porque a clínica estará fechada ({{holiday_reason}}).\n\nPor favor, entre em contato com a clínica para reagendar. 🙏\n━━━━━━━━━━━━━━━━━━━━',
  },
};

export function renderTemplate(template, vars = {}) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] ?? ''));
}

// Carrega todos os overrides do banco de uma vez (chamado 1x por mensagem
// recebida, não por template) e devolve uma função `t(key, vars)` já com
// fallback pro texto padrão quando não há override.
export async function loadMessageRenderer() {
  const overrides = await prisma.whatsAppMessageTemplate.findMany();
  const overrideMap = new Map(overrides.map((o) => [o.key, o.template]));
  return (key, vars) => {
    const template = overrideMap.get(key) ?? DEFAULT_TEMPLATES[key]?.template ?? '';
    return renderTemplate(template, vars);
  };
}
