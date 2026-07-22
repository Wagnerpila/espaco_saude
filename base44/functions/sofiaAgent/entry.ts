/**
 * Sofia Agent - Integração WhatsApp via n8n
 * Máquina de estados explícita para fluxo de formulário passo a passo.
 *
 * Payload esperado (POST):
 * { "phone": "5511999999999", "message": "Olá", "session_id": "abc123" }
 * Autenticação: Header "x-webhook-secret"
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : '55' + digits;
}

function normMsg(msg) {
  // Remove espaços, emojis, caracteres especiais — mantém apenas letras e dígitos
  return String(msg).trim().replace(/[^\d\w]/g, '').toLowerCase();
}

// Extrai apenas o primeiro número digitado (ex: "1", " 1 ", "1️⃣" → "1")
function extractChoice(msg) {
  const match = String(msg).match(/\d+/);
  return match ? match[0] : '';
}

// Retorna data/hora atual no fuso de Brasília
function nowBrasilia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

// Retorna data atual em Brasília no formato YYYY-MM-DD
function todayBrasilia() {
  const d = nowBrasilia();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Mapeia nome do dia em inglês para português (working_hours key)
const DAY_MAP = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday'
};

// Verifica se profissional atende no dia da semana e retorna { active, start, end }
function getProfessionalDaySchedule(professional, dayOfWeek) {
  const wh = professional.working_hours;
  if (!wh) return null;
  const dayKey = DAY_MAP[dayOfWeek];
  const dayConfig = wh[dayKey];
  if (!dayConfig || !dayConfig.active) return null;
  return dayConfig; // { start, end, active }
}

// Gerar slots de horário disponíveis baseado nos horários do profissional
function getAvailableSlots(dayConfig, bookedTimes) {
  if (!dayConfig || !dayConfig.start || !dayConfig.end) return [];
  const [startH] = dayConfig.start.split(':').map(Number);
  const [endH] = dayConfig.end.split(':').map(Number);
  const slots = [];
  for (let h = startH; h < endH; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    if (!bookedTimes.includes(t)) slots.push(t);
  }
  return slots;
}

// Formata data DD/MM/AAAA → YYYY-MM-DD
function parseDateBR(str) {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

// Mapeia dia da semana (0=dom, 6=sab)
function getDayOfWeek(isoDate) {
  return new Date(isoDate + 'T12:00:00').getDay();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret'
      }
    });
  }

  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (secret) {
    const provided = req.headers.get('x-webhook-secret');
    if (provided !== secret) {
      console.log(`[sofia] Auth falhou. Recebido="${provided}"`);
      return Response.json({ error: 'Não autorizado' }, { status: 401, headers });
    }
  }

  let body = {};
  try { body = await req.json(); } catch (_) {}

  console.log(`[sofia] body recebido: ${JSON.stringify(body).slice(0, 800)}`);

  let phone = '';
  let session_id = '';
  let message = '';

  // Helper: tenta fazer parse de JSON se for string
  function tryParseJSON(val) {
    if (typeof val === 'object' && val !== null) return val;
    if (typeof val === 'string') {
      const clean = val.replace(/^=+/, '').trim();
      try { return JSON.parse(clean); } catch (_) {}
    }
    return null;
  }

  // Helper: extrai texto de um objeto de mensagem Evolution API
  function extractTextFromMsg(msgObj) {
    if (!msgObj) return '';
    return msgObj.conversation
      || msgObj.extendedTextMessage?.text
      || msgObj.imageMessage?.caption
      || msgObj.videoMessage?.caption
      || '';
  }

  // Helper: limpa string com prefixo "=" gerado pelo n8n
  function cleanStr(val) {
    return String(val || '').replace(/^=+/, '').trim();
  }

  // Estratégia 1: body.body como objeto ou string JSON (n8n Edit Fields com body bruto)
  const bodyBodyObj = tryParseJSON(body.body);
  if (bodyBodyObj) {
    const evData = tryParseJSON(bodyBodyObj.data) || {};
    const evMsg = tryParseJSON(evData.message) || {};
    const evKey = tryParseJSON(evData.key) || {};
    const rawText = extractTextFromMsg(evMsg);
    if (rawText) {
      message = String(rawText).trim();
      phone = cleanStr(bodyBodyObj.instance) || cleanStr(evKey.remoteJid) || '';
      session_id = cleanStr(evKey.id) || cleanStr(bodyBodyObj.instance) || phone;
      console.log(`[sofia] Evolution via body.body. phone="${phone}" message="${message}"`);
    }
  }

  // Estratégia 2: body.data como objeto ou string JSON (Evolution API direto)
  if (!message) {
    const bodyDataObj = tryParseJSON(body.data);
    if (bodyDataObj) {
      const evMsg = tryParseJSON(bodyDataObj.message) || {};
      const evKey = tryParseJSON(bodyDataObj.key) || {};
      const rawText = extractTextFromMsg(evMsg);
      if (rawText) {
        message = String(rawText).trim();
        phone = cleanStr(body.instance) || cleanStr(evKey.remoteJid) || '';
        session_id = cleanStr(evKey.id) || cleanStr(body.instance) || phone;
        console.log(`[sofia] Evolution via body.data. phone="${phone}" message="${message}"`);
      }
    }
  }

  // Estratégia 3: campos diretos no body (n8n já extraiu os campos)
  // Suporta tanto valores limpos quanto com prefixo "=" do n8n
  if (!message) {
    const rawPhone = cleanStr(body.phone);
    const rawSession = cleanStr(body.session_id);
    const rawMsg = cleanStr(body.message);

    if (rawMsg && rawMsg !== '[object Object]' && !rawMsg.startsWith('{')) {
      message = rawMsg;
    }
    // Tenta também body.message como objeto
    if (!message) {
      const msgObj = tryParseJSON(body.message);
      if (msgObj) {
        const rawText = extractTextFromMsg(msgObj);
        if (rawText) message = String(rawText).trim();
      }
    }
    if (!phone) phone = rawPhone;
    if (!session_id) session_id = rawSession;
    console.log(`[sofia] Fallback campos diretos. phone="${phone}" message="${message}"`);
  }

  // Estratégia 4: n8n passou campos com os caminhos Evolution completos
  // ex: body["body.data.message.conversation"] ou body["data.key.remoteJid"]
  if (!message) {
    const keys = Object.keys(body);
    for (const k of keys) {
      if (k.includes('conversation') || k.includes('message.conversation')) {
        const val = cleanStr(body[k]);
        if (val && val !== '[object Object]') { message = val; break; }
      }
    }
    if (!phone) {
      for (const k of keys) {
        if (k.includes('remoteJid') || k.includes('instance')) {
          const val = cleanStr(body[k]);
          if (val && val !== '[object Object]') { phone = val; break; }
        }
      }
    }
    if (message) console.log(`[sofia] Extraído via chave aninhada. phone="${phone}" message="${message}"`);
  }

  console.log(`[sofia] Extração final: phone="${phone}" message="${message}" session="${session_id}"`);

  if (!phone || !message) {
    return Response.json({ error: 'phone e message são obrigatórios', received_keys: Object.keys(body) }, { status: 400, headers });
  }

  const base44 = createClientFromRequest(req);
  const phoneNorm = formatPhone(phone);
  const sessionKey = session_id || phoneNorm;
  const now = new Date().toISOString();

  try {
    // Carregar dados da clínica
    const [professionals, allPatients] = await Promise.all([
      base44.asServiceRole.entities.Professional.list(),
      base44.asServiceRole.entities.Patient.list()
    ]);

    const activeProfessionals = professionals.filter(p => p.active !== false).sort((a, b) => a.full_name.localeCompare(b.full_name));

    // Identificar paciente pelo telefone
    const patientByPhone = allPatients.find(p =>
      p.phone && formatPhone(p.phone) === phoneNorm
    );

    // Buscar conversa existente (pegar a mais recente se houver múltiplas)
    const conversations = await base44.asServiceRole.entities.WhatsAppConversation.filter({ phone: phoneNorm });
    const conversation = conversations.sort((a, b) => (b.last_active || '').localeCompare(a.last_active || ''))[0] || null;
    console.log(`[sofia] conversas encontradas para ${phoneNorm}: ${conversations.length}, usando id=${conversation?.id}`);
    console.log(`[sofia] state_salvo=${JSON.stringify(conversation?.state)}, draft_salvo=${JSON.stringify(conversation?.draft)}`);

    // Timeout de sessão: se última atividade foi há mais de 2 horas, reinicia
    const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas
    const lastActive = conversation?.last_active ? new Date(conversation.last_active).getTime() : 0;
    const sessionExpired = lastActive > 0 && (Date.now() - lastActive) > SESSION_TIMEOUT_MS;

    if (sessionExpired) {
      console.log(`[sofia] Sessão expirada para ${phoneNorm}. Reiniciando.`);
    }

    // Verificar se paciente está em modo "atendente" (silenciado por 1 hora)
    const ATTENDANT_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora
    const attendantModeUntil = conversation?.state?.attendant_mode_until;
    const isInAttendantMode = attendantModeUntil && new Date(attendantModeUntil).getTime() > Date.now();

    if (isInAttendantMode) {
      console.log(`[sofia] Paciente em modo atendente até ${attendantModeUntil}. Sofia silenciada.`);
      // Silenciosamente ignora a mensagem sem responder nada
      return Response.json({ 
        ignored: true,
        phone: phoneNorm, 
        session_id: sessionKey
      }, { headers });
    }

    // Estado salvo na conversa (reseta se expirado)
    let state = (!sessionExpired && conversation?.state) ? conversation.state : { step: 'MENU' };
    let draft = (!sessionExpired && conversation?.draft) ? conversation.draft : {};

    const msg = normMsg(message);
    const choice = extractChoice(message); // número da opção escolhida
    let reply = '';

    console.log(`[sofia] step=${state.step} raw="${message}" msg="${msg}" choice="${choice}" conv_id=${conversation?.id || 'nova'} state_json=${JSON.stringify(state)}`);
    console.log(`[sofia] message_type=${typeof message} message_length=${message.length}`);

    // ─── Máquina de estados ────────────────────────────────────────
    const MENU_TEXT = `👇 *Digite o número da opção desejada:*\n\n1️⃣ Agendar consulta\n2️⃣ Cancelar consulta\n3️⃣ Informações sobre serviços\n4️⃣ Falar com atendente`;

    const isGreeting = /^(oi|ola|ol|bom|boa|olá|hey|hi|hello|tudo|salve|bom dia|boa tarde|boa noite)/i.test(message.trim());
    const safeguardSteps = ['CADASTRO_NOME', 'CADASTRO_CPF', 'CADASTRO_NASCIMENTO', 'CADASTRO_EMAIL'];

    // Saudações sempre mostram o menu (exceto em etapas de cadastro)
    if (isGreeting && !safeguardSteps.includes(state.step)) {
      const nome = patientByPhone ? `, ${patientByPhone.full_name.split(' ')[0]}` : '';
      reply = `Olá${nome}! 👋 Bem-vindo(a) à Clínica Espaço Saúde.\n\nO que deseja fazer?\n\n${MENU_TEXT}`;
      state = { step: 'AGUARDA_MENU' };
      draft = {};
      // pula o switch
    } else switch (state.step) {

      case 'MENU': {
        const nome = patientByPhone ? `, ${patientByPhone.full_name.split(' ')[0]}` : '';
        reply = `Olá${nome}! 👋 Bem-vindo(a) à Clínica Espaço Saúde.\n\n${MENU_TEXT}`;
        state = { step: 'AGUARDA_MENU' };
        break;
      }

      case 'AGUARDA_MENU': {
        if (choice === '1') {
          // Listar profissionais
          const lista = activeProfessionals.map((p, i) => `${i + 1}️⃣ ${p.full_name} - ${p.specialty}`).join('\n');
          reply = `Ótimo! Escolha o profissional:\n\n${lista}\n\n👇 *Digite o número do profissional desejado:*`;
          state = { step: 'AGUARDA_PROFISSIONAL', profList: activeProfessionals.map(p => p.id) };
        } else if (choice === '2') {
          if (!patientByPhone) {
            reply = `Para cancelar, preciso identificar você.\n\n👇 *Digite seu CPF* (apenas números):`;
            state = { step: 'CANCELAR_CPF' };
          } else {
            // Buscar consultas futuras do paciente
            const today = todayBrasilia();
            const apts = await base44.asServiceRole.entities.Appointment.filter({ patient_id: patientByPhone.id });
            const futuras = apts.filter(a => a.appointment_date >= today && !['cancelled', 'completed'].includes(a.status));
            if (futuras.length === 0) {
              reply = `Você não possui consultas futuras para cancelar.\n\n👇 *Digite menu* para voltar ao início.`;
              state = { step: 'MENU' };
            } else {
              const lista = futuras.map((a, i) => {
                const prof = professionals.find(p => p.id === a.professional_id);
                return `${i + 1}️⃣ ${formatDateBR(a.appointment_date)} às ${a.appointment_time} com ${prof?.full_name || 'N/A'}`;
              }).join('\n');
              reply = `Qual consulta deseja cancelar?\n\n${lista}\n\n👇 *Digite o número da consulta* que deseja cancelar:`;
              state = { step: 'AGUARDA_CANCELAR', aptIds: futuras.map(a => a.id) };
            }
          }
        } else if (choice === '3') {
          reply = `Nossos serviços:\n\n💆 *Estética* - Tratamentos faciais e corporais\n🦴 *Fisioterapia* - Ortopédica e neurológica\n🧘 *Pilates* - Equipamento e solo\n\n⏰ Horários:\nSeg-Sex: 08h às 18h\nSáb: 08h às 12h\n\n👇 *Digite 1* para agendar ou *menu* para voltar ao início.`;
          state = { step: 'AGUARDA_MENU' };
        } else if (choice === '4') {
           reply = `Encaminhando para atendente... 📞\n\nEm breve alguém entrará em contato.\n\n👇 *Digite menu* para voltar ao início.`;
           // Ativa modo atendente: Sofia vai ignorar por 1 hora
           const attendantUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
           state = { step: 'MENU', attendant_mode_until: attendantUntil };
        } else {
          reply = `⚠️ Opção não reconhecida.\n\n${MENU_TEXT}`;
        }
        break;
      }

      case 'AGUARDA_PROFISSIONAL': {
        // Usar a lista salva no state para manter ordem consistente
        const savedProfIds = state.profList || [];
        const orderedProfs = savedProfIds.length > 0
          ? savedProfIds.map(id => professionals.find(p => p.id === id)).filter(Boolean)
          : activeProfessionals;
        const idx = parseInt(choice) - 1;
        console.log(`[sofia] AGUARDA_PROFISSIONAL: choice="${choice}" idx=${idx} total=${orderedProfs.length} savedProfIds=${JSON.stringify(savedProfIds)}`);
        if (isNaN(idx) || idx < 0 || idx >= orderedProfs.length) {
          const lista = orderedProfs.map((p, i) => `${i + 1}️⃣ ${p.full_name} - ${p.specialty}`).join('\n');
          reply = `⚠️ Opção inválida.\n\n${lista}\n\n👇 *Digite o número* do profissional desejado:`;
        } else {
          const prof = orderedProfs[idx];
          draft.professional_id = prof.id;
          draft.professional_name = prof.full_name;
          reply = `Ótimo! *${prof.full_name}* selecionado. ✅\n\n👇 *Digite a data* que preferir no formato *DD/MM/AAAA*\n\nExemplo: 15/05/2026`;
          state = { step: 'AGUARDA_DATA' };
        }
        break;
      }

      case 'AGUARDA_DATA': {
        const dateMatch = message.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dateMatch) {
          reply = `⚠️ Data inválida.\n\n👇 *Digite a data* no formato *DD/MM/AAAA*\n\nExemplo: 15/05/2026`;
        } else {
          const isoDate = parseDateBR(message);
          const dayOfWeek = getDayOfWeek(isoDate);
          const today = todayBrasilia();

          if (isoDate < today) {
            reply = `⚠️ Esta data já passou.\n\n👇 *Digite uma data futura* no formato *DD/MM/AAAA*`;
          } else if (dayOfWeek === 0) {
            reply = `Aos domingos estamos fechados. 🔒\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*`;
          } else {
            const profissional = professionals.find(p => p.id === draft.professional_id);
            const dayConfig = getProfessionalDaySchedule(profissional, dayOfWeek);

            if (!dayConfig) {
              const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
              reply = `${draft.professional_name} não atende às ${dayNames[dayOfWeek]}s. 🔒\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*`;
            } else {
              const blocks = await base44.asServiceRole.entities.ScheduleBlock.filter({ professional_id: draft.professional_id, active: true });
              const isBlocked = blocks.some(b => {
                if (!b.start_date) return false;
                return isoDate >= b.start_date && isoDate <= (b.end_date || b.start_date);
              });

              if (isBlocked) {
                reply = `${draft.professional_name} não está disponível em *${formatDateBR(isoDate)}* (feriado ou bloqueio de agenda).\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*`;
              } else {
                const apts = await base44.asServiceRole.entities.Appointment.filter({
                  appointment_date: isoDate,
                  professional_id: draft.professional_id
                });
                const bookedTimes = apts
                  .filter(a => !['cancelled', 'null_absence'].includes(a.status))
                  .map(a => a.appointment_time);

                const slots = getAvailableSlots(dayConfig, bookedTimes);

                if (slots.length === 0) {
                  reply = `Não há horários disponíveis em *${formatDateBR(isoDate)}* com ${draft.professional_name}.\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*`;
                } else {
                  draft.date = isoDate;
                  const lista = slots.map((s, i) => `${i + 1}️⃣ ${s}`).join('\n');
                  reply = `Horários disponíveis em *${formatDateBR(isoDate)}* com ${draft.professional_name}:\n\n${lista}\n\n_(Expediente: ${dayConfig.start} às ${dayConfig.end})_\n\n👇 *Digite o número* do horário desejado:`;
                  state = { step: 'AGUARDA_HORARIO', slots };
                }
              }
            }
          }
        }
        break;
      }

      case 'AGUARDA_HORARIO': {
        const slots = state.slots || [];
        const idx = parseInt(choice) - 1;
        if (isNaN(idx) || idx < 0 || idx >= slots.length) {
          const lista = slots.map((s, i) => `${i + 1}️⃣ ${s}`).join('\n');
          reply = `⚠️ Opção inválida.\n\n${lista}\n\n👇 *Digite o número* do horário desejado:`;
        } else {
          draft.time = slots[idx];
          if (patientByPhone) {
            reply = `Encontrei seu cadastro! ✅\n\n👤 *${patientByPhone.full_name}*\n📱 ${patientByPhone.phone}\n\nSeus dados estão corretos?\n\n1️⃣ Sim, estão corretos\n2️⃣ Não, quero usar outros dados\n\n👇 *Digite 1 ou 2:*`;
            state = { step: 'CONFIRMA_PACIENTE' };
          } else {
            reply = `Não encontrei seu cadastro no sistema. Vou fazer um cadastro rápido! 📋\n\n*Passo 1 de 3*\n👇 *Digite seu nome completo:*`;
            state = { step: 'CADASTRO_NOME' };
          }
        }
        break;
      }

      case 'CONFIRMA_PACIENTE': {
        if (choice === '1') {
          draft.patient_id = patientByPhone.id;
          draft.patient_name = patientByPhone.full_name;
          reply = `Perfeito! Confirme o agendamento:\n\n📅 *Data:* ${formatDateBR(draft.date)}\n⏰ *Horário:* ${draft.time}\n👨‍⚕️ *Profissional:* ${draft.professional_name}\n👤 *Paciente:* ${draft.patient_name}\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar\n\n👇 *Digite 1 para confirmar ou 2 para cancelar:*`;
          state = { step: 'CONFIRMA_AGENDAMENTO' };
        } else if (choice === '2') {
          reply = `Ok! Vamos usar outros dados.\n\n*Passo 1 de 3*\n👇 *Digite seu nome completo:*`;
          state = { step: 'CADASTRO_NOME' };
        } else {
          reply = `👇 *Digite 1 ou 2:*\n\n1️⃣ Sim, meus dados estão corretos\n2️⃣ Não, quero usar outros dados`;
        }
        break;
      }

      case 'CADASTRO_NOME': {
        if (message.trim().length < 3) {
          reply = `⚠️ Nome muito curto. Por favor informe seu nome completo.\n\n👇 *Digite seu nome completo:*`;
        } else {
          draft.patient_name = message.trim();
          // Tentar encontrar pelo nome no sistema
          const nomeNorm = draft.patient_name.toLowerCase();
          const found = allPatients.find(p => p.full_name && p.full_name.toLowerCase().includes(nomeNorm.split(' ')[0]) && p.full_name.toLowerCase().includes(nomeNorm.split(' ').pop()));
          if (found && found.phone !== phoneNorm) {
            // Paciente encontrado com nome similar, perguntar se é ele
            draft.found_patient_id = found.id;
            draft.found_patient_name = found.full_name;
            reply = `Encontrei um cadastro com nome similar:\n\n👤 *${found.full_name}*\n\nÉ você?\n\n1️⃣ Sim, sou eu\n2️⃣ Não, sou outra pessoa\n\n👇 *Digite 1 ou 2:*`;
            state = { step: 'CONFIRMA_PACIENTE_NOME' };
          } else {
            reply = `✅ Nome registrado: *${draft.patient_name}*\n\n*Passo 2 de 3*\n👇 *Digite seu CPF* (somente números, 11 dígitos):\n\nExemplo: 12345678900`;
            state = { step: 'CADASTRO_CPF' };
          }
        }
        break;
      }

      case 'CONFIRMA_PACIENTE_NOME': {
        if (choice === '1') {
          // Usar o paciente encontrado
          draft.patient_id = draft.found_patient_id;
          draft.patient_name = draft.found_patient_name;
          reply = `Perfeito! Confirme o agendamento:\n\n📅 *Data:* ${formatDateBR(draft.date)}\n⏰ *Horário:* ${draft.time}\n👨‍⚕️ *Profissional:* ${draft.professional_name}\n👤 *Paciente:* ${draft.patient_name}\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar\n\n👇 *Digite 1 para confirmar ou 2 para cancelar:*`;
          state = { step: 'CONFIRMA_AGENDAMENTO' };
        } else if (choice === '2') {
          reply = `Ok! Vamos continuar seu cadastro.\n\n*Passo 2 de 3*\n👇 *Digite seu CPF* (somente números, 11 dígitos):\n\nExemplo: 12345678900`;
          state = { step: 'CADASTRO_CPF' };
        } else {
          reply = `👇 *Digite 1 ou 2:*\n\n1️⃣ Sim, sou eu\n2️⃣ Não, sou outra pessoa`;
        }
        break;
      }

      case 'CADASTRO_CPF': {
        const cpf = message.replace(/\D/g, '');
        if (cpf.length !== 11) {
          reply = `⚠️ CPF inválido. Precisa ter 11 dígitos.\n\n👇 *Digite seu CPF* (somente números):\n\nExemplo: 12345678900`;
        } else {
          // Verificar se CPF já existe
          const cpfFound = allPatients.find(p => p.cpf && p.cpf.replace(/\D/g, '') === cpf);
          if (cpfFound) {
            draft.patient_id = cpfFound.id;
            draft.patient_name = cpfFound.full_name;
            reply = `✅ CPF encontrado! Cadastro localizado:\n\n👤 *${cpfFound.full_name}*\n\nConfirme o agendamento:\n\n📅 *Data:* ${formatDateBR(draft.date)}\n⏰ *Horário:* ${draft.time}\n👨‍⚕️ *Profissional:* ${draft.professional_name}\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar\n\n👇 *Digite 1 para confirmar ou 2 para cancelar:*`;
            state = { step: 'CONFIRMA_AGENDAMENTO' };
          } else {
            draft.patient_cpf = cpf;
            reply = `✅ CPF registrado.\n\n*Passo 3 de 3*\n👇 *Digite sua data de nascimento* no formato *DD/MM/AAAA*:\n\nExemplo: 15/03/1990`;
            state = { step: 'CADASTRO_NASCIMENTO' };
          }
        }
        break;
      }

      case 'CADASTRO_NASCIMENTO': {
        const dateMatchBirth = message.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dateMatchBirth) {
          reply = `⚠️ Data inválida.\n\n👇 *Digite sua data de nascimento* no formato *DD/MM/AAAA*:\n\nExemplo: 15/03/1990`;
        } else {
          draft.patient_birth = parseDateBR(message);
          reply = `✅ Cadastro quase pronto!\n\nResumo dos seus dados:\n👤 *Nome:* ${draft.patient_name}\n🪪 *CPF:* ${draft.patient_cpf}\n🎂 *Nascimento:* ${message.match(/(\d{2})\/(\d{2})\/(\d{4})/)[0]}\n\nSeus dados estão corretos?\n\n1️⃣ ✅ Sim, continuar\n2️⃣ ✏️ Corrigir dados\n\n👇 *Digite 1 para continuar ou 2 para corrigir:*`;
          state = { step: 'CONFIRMA_CADASTRO' };
        }
        break;
      }

      case 'CONFIRMA_CADASTRO': {
        if (choice === '1') {
          reply = `Confirme o agendamento:\n\n📅 *Data:* ${formatDateBR(draft.date)}\n⏰ *Horário:* ${draft.time}\n👨‍⚕️ *Profissional:* ${draft.professional_name}\n👤 *Paciente:* ${draft.patient_name}\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar\n\n👇 *Digite 1 para confirmar ou 2 para cancelar:*`;
          state = { step: 'CONFIRMA_AGENDAMENTO' };
        } else if (choice === '2') {
          draft.patient_name = '';
          draft.patient_cpf = '';
          draft.patient_birth = '';
          reply = `Ok! Vamos corrigir.\n\n*Passo 1 de 3*\n👇 *Digite seu nome completo:*`;
          state = { step: 'CADASTRO_NOME' };
        } else {
          reply = `👇 *Digite 1 ou 2:*\n\n1️⃣ ✅ Sim, continuar\n2️⃣ ✏️ Corrigir dados`;
        }
        break;
      }

      case 'CONFIRMA_AGENDAMENTO': {
        if (choice === '1') {
          let patientId = draft.patient_id;
          if (!patientId) {
            const newPatient = await base44.asServiceRole.entities.Patient.create({
              full_name: draft.patient_name,
              cpf: draft.patient_cpf || '',
              birth_date: draft.patient_birth || '',
              phone: phoneNorm,
              active: true
            });
            patientId = newPatient.id;
          }

          await base44.asServiceRole.entities.Appointment.create({
            patient_id: patientId,
            professional_id: draft.professional_id,
            appointment_date: draft.date,
            appointment_time: draft.time,
            status: 'confirmed',
            duration: 60
          });

          reply = `✅ *Agendamento confirmado com sucesso!*\n\n📅 *Data:* ${formatDateBR(draft.date)}\n⏰ *Horário:* ${draft.time}\n👨‍⚕️ *Profissional:* ${draft.professional_name}\n👤 *Paciente:* ${draft.patient_name}\n\nAté lá! 💙\n\n👇 *Digite menu* para voltar ao início.`;
          state = { step: 'MENU' };
          draft = {};
        } else if (choice === '2') {
          reply = `Agendamento cancelado. ❌\n\n👇 *Digite menu* para voltar ao início.`;
          state = { step: 'MENU' };
          draft = {};
        } else {
          reply = `👇 *Digite 1 para confirmar ou 2 para cancelar:*\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar`;
        }
        break;
      }

      case 'AGUARDA_CANCELAR': {
        const aptIds = state.aptIds || [];
        const idx = parseInt(choice) - 1;
        if (isNaN(idx) || idx < 0 || idx >= aptIds.length) {
          reply = `⚠️ Opção inválida.\n\n👇 *Digite o número* da consulta que deseja cancelar:`;
        } else {
          await base44.asServiceRole.entities.Appointment.update(aptIds[idx], { status: 'cancelled' });
          reply = `✅ Consulta cancelada com sucesso.\n\n👇 *Digite menu* para voltar ao início.`;
          state = { step: 'MENU' };
        }
        break;
      }

      case 'CANCELAR_CPF': {
        const cpf = message.replace(/\D/g, '');
        const found = allPatients.find(p => p.cpf && p.cpf.replace(/\D/g, '') === cpf);
        if (!found) {
          reply = `CPF não encontrado. Verifique e tente novamente.\n\n👇 *Digite seu CPF* ou *menu* para voltar:`;
        } else {
          const today = todayBrasilia();
          const apts = await base44.asServiceRole.entities.Appointment.filter({ patient_id: found.id });
          const futuras = apts.filter(a => a.appointment_date >= today && !['cancelled', 'completed'].includes(a.status));
          if (futuras.length === 0) {
            reply = `Não há consultas futuras para cancelar.\n\n👇 *Digite menu* para voltar ao início.`;
            state = { step: 'MENU' };
          } else {
            const lista = futuras.map((a, i) => {
              const prof = professionals.find(p => p.id === a.professional_id);
              return `${i + 1}️⃣ ${formatDateBR(a.appointment_date)} às ${a.appointment_time} com ${prof?.full_name || 'N/A'}`;
            }).join('\n');
            reply = `Qual consulta deseja cancelar?\n\n${lista}\n\n👇 *Digite o número* da consulta que deseja cancelar:`;
            state = { step: 'AGUARDA_CANCELAR', aptIds: futuras.map(a => a.id) };
          }
        }
        break;
      }

      default: {
        const nome = patientByPhone ? `, ${patientByPhone.full_name.split(' ')[0]}` : '';
        reply = `Olá${nome}! 👋\n\n${MENU_TEXT}`;
        state = { step: 'AGUARDA_MENU' };
      }
    }

    // Tratar "menu" como palavra-chave para reiniciar
    if (normMsg(message) === 'menu' && !['MENU', 'AGUARDA_MENU'].includes(state.step)) {
      reply = `${MENU_TEXT}`;
      state = { step: 'AGUARDA_MENU' };
      draft = {};
    }

    // Persistir conversa com estado
    const updatedMessages = [
      ...(conversation?.messages || []).slice(-18),
      { role: 'user', content: message, timestamp: now },
      { role: 'assistant', content: reply, timestamp: now }
    ];

    const saveData = {
      messages: updatedMessages,
      last_active: now,
      state,
      draft,
      patient_id: patientByPhone ? patientByPhone.id : (conversation?.patient_id || undefined)
    };

    if (conversation) {
      await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, saveData);
    } else {
      await base44.asServiceRole.entities.WhatsAppConversation.create({
        phone: phoneNorm,
        session_id: sessionKey,
        ...saveData
      });
    }

    return Response.json({ reply, phone: phoneNorm, session_id: sessionKey }, { headers });

  } catch (error) {
    console.error('[sofiaAgent] Error:', error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
});