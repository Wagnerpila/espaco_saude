import { prisma } from '../db.js';
import { formatPhone, todayBrasilia } from '../utils/format.js';

// Porte quase 1:1 de base44/functions/sofiaAgent/entry.ts — máquina de
// estados explícita (menu numérico) para o bot de WhatsApp. Antes rodava
// como função Deno chamada pelo n8n, que também era responsável por mandar
// a resposta de volta pela Evolution API; agora tudo isso vive aqui e em
// routes/webhooks.routes.js (que chama processInboundMessage e depois manda
// a resposta via evolutionClient.sendText).

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas
const ATTENDANT_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora

const DAY_MAP = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
const DAY_NAMES_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const MENU_TEXT = `👇 *Digite o número da opção desejada:*\n\n1️⃣ Agendar consulta\n2️⃣ Cancelar consulta\n3️⃣ Informações sobre serviços\n4️⃣ Falar com atendente`;

function normMsg(msg) {
  return String(msg).trim().replace(/[^\d\w]/g, '').toLowerCase();
}

function extractChoice(msg) {
  const match = String(msg).match(/\d+/);
  return match ? match[0] : '';
}

function parseDateBR(str) {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function toISODate(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function getDayOfWeek(isoDate) {
  return new Date(`${isoDate}T12:00:00`).getDay();
}

function getProfessionalDaySchedule(professional, dayOfWeek) {
  const wh = professional.workingHours;
  if (!wh) return null;
  const dayConfig = wh[DAY_MAP[dayOfWeek]];
  if (!dayConfig || !dayConfig.active) return null;
  return dayConfig;
}

function getAvailableSlots(dayConfig, bookedTimes) {
  if (!dayConfig?.start || !dayConfig?.end) return [];
  const [startH] = dayConfig.start.split(':').map(Number);
  const [endH] = dayConfig.end.split(':').map(Number);
  const slots = [];
  for (let h = startH; h < endH; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    if (!bookedTimes.includes(t)) slots.push(t);
  }
  return slots;
}

// Processa uma mensagem recebida e devolve a resposta a ser enviada (ou
// { ignored: true } se o bot deve ficar em silêncio — modo atendente).
export async function processInboundMessage({ phone, message, sessionId }) {
  const phoneNorm = formatPhone(phone);
  const sessionKey = sessionId || phoneNorm;
  const now = new Date();
  const nowIso = now.toISOString();

  const [professionals, allPatients] = await Promise.all([
    prisma.professional.findMany(),
    prisma.patient.findMany(),
  ]);
  const activeProfessionals = professionals.filter((p) => p.active !== false).sort((a, b) => a.fullName.localeCompare(b.fullName));

  const patientByPhone = allPatients.find((p) => p.phone && formatPhone(p.phone) === phoneNorm);

  const conversation = await prisma.whatsAppConversation.findFirst({
    where: { phone: phoneNorm },
    orderBy: { lastActive: 'desc' },
  });

  const lastActive = conversation?.lastActive ? conversation.lastActive.getTime() : 0;
  const sessionExpired = lastActive > 0 && Date.now() - lastActive > SESSION_TIMEOUT_MS;

  const attendantModeUntil = conversation?.state?.attendant_mode_until;
  const isInAttendantMode = attendantModeUntil && new Date(attendantModeUntil).getTime() > Date.now();

  if (isInAttendantMode) {
    return { ignored: true, phone: phoneNorm, sessionId: sessionKey };
  }

  let state = !sessionExpired && conversation?.state ? conversation.state : { step: 'MENU' };
  let draft = !sessionExpired && conversation?.draft ? conversation.draft : {};

  const msg = normMsg(message);
  const choice = extractChoice(message);
  let reply = '';

  const isGreeting = /^(oi|ola|ol|bom|boa|olá|hey|hi|hello|tudo|salve|bom dia|boa tarde|boa noite)/i.test(message.trim());
  const safeguardSteps = ['CADASTRO_NOME', 'CADASTRO_CPF', 'CADASTRO_NASCIMENTO', 'CADASTRO_EMAIL'];

  if (isGreeting && !safeguardSteps.includes(state.step)) {
    const nome = patientByPhone ? `, ${patientByPhone.fullName.split(' ')[0]}` : '';
    reply = `Olá${nome}! 👋 Bem-vindo(a) à Clínica Espaço Saúde.\n\nO que deseja fazer?\n\n${MENU_TEXT}`;
    state = { step: 'AGUARDA_MENU' };
    draft = {};
  } else {
    switch (state.step) {
      case 'MENU': {
        const nome = patientByPhone ? `, ${patientByPhone.fullName.split(' ')[0]}` : '';
        reply = `Olá${nome}! 👋 Bem-vindo(a) à Clínica Espaço Saúde.\n\n${MENU_TEXT}`;
        state = { step: 'AGUARDA_MENU' };
        break;
      }

      case 'AGUARDA_MENU': {
        if (choice === '1') {
          const lista = activeProfessionals.map((p, i) => `${i + 1}️⃣ ${p.fullName} - ${p.specialty}`).join('\n');
          reply = `Ótimo! Escolha o profissional:\n\n${lista}\n\n👇 *Digite o número do profissional desejado:*`;
          state = { step: 'AGUARDA_PROFISSIONAL', profList: activeProfessionals.map((p) => p.id) };
        } else if (choice === '2') {
          if (!patientByPhone) {
            reply = `Para cancelar, preciso identificar você.\n\n👇 *Digite seu CPF* (apenas números):`;
            state = { step: 'CANCELAR_CPF' };
          } else {
            const today = todayBrasilia();
            const apts = await prisma.appointment.findMany({ where: { patientId: patientByPhone.id } });
            const futuras = apts.filter((a) => toISODate(a.appointmentDate) >= today && !['cancelled', 'completed'].includes(a.status));
            if (futuras.length === 0) {
              reply = `Você não possui consultas futuras para cancelar.\n\n👇 *Digite menu* para voltar ao início.`;
              state = { step: 'MENU' };
            } else {
              const lista = futuras.map((a, i) => {
                const prof = professionals.find((p) => p.id === a.professionalId);
                return `${i + 1}️⃣ ${formatDateBR(a.appointmentDate)} às ${a.appointmentTime} com ${prof?.fullName || 'N/A'}`;
              }).join('\n');
              reply = `Qual consulta deseja cancelar?\n\n${lista}\n\n👇 *Digite o número da consulta* que deseja cancelar:`;
              state = { step: 'AGUARDA_CANCELAR', aptIds: futuras.map((a) => a.id) };
            }
          }
        } else if (choice === '3') {
          reply = `Nossos serviços:\n\n💆 *Estética* - Tratamentos faciais e corporais\n🦴 *Fisioterapia* - Ortopédica e neurológica\n🧘 *Pilates* - Equipamento e solo\n\n⏰ Horários:\nSeg-Sex: 08h às 18h\nSáb: 08h às 12h\n\n👇 *Digite 1* para agendar ou *menu* para voltar ao início.`;
          state = { step: 'AGUARDA_MENU' };
        } else if (choice === '4') {
          reply = `Encaminhando para atendente... 📞\n\nEm breve alguém entrará em contato.\n\n👇 *Digite menu* para voltar ao início.`;
          const attendantUntil = new Date(Date.now() + ATTENDANT_TIMEOUT_MS).toISOString();
          state = { step: 'MENU', attendant_mode_until: attendantUntil };
        } else {
          reply = `⚠️ Opção não reconhecida.\n\n${MENU_TEXT}`;
        }
        break;
      }

      case 'AGUARDA_PROFISSIONAL': {
        const savedProfIds = state.profList || [];
        const orderedProfs = savedProfIds.length > 0
          ? savedProfIds.map((id) => professionals.find((p) => p.id === id)).filter(Boolean)
          : activeProfessionals;
        const idx = parseInt(choice, 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= orderedProfs.length) {
          const lista = orderedProfs.map((p, i) => `${i + 1}️⃣ ${p.fullName} - ${p.specialty}`).join('\n');
          reply = `⚠️ Opção inválida.\n\n${lista}\n\n👇 *Digite o número* do profissional desejado:`;
        } else {
          const prof = orderedProfs[idx];
          draft.professional_id = prof.id;
          draft.professional_name = prof.fullName;
          reply = `Ótimo! *${prof.fullName}* selecionado. ✅\n\n👇 *Digite a data* que preferir no formato *DD/MM/AAAA*\n\nExemplo: 15/05/2026`;
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
            const profissional = professionals.find((p) => p.id === draft.professional_id);
            const dayConfig = getProfessionalDaySchedule(profissional, dayOfWeek);

            if (!dayConfig) {
              reply = `${draft.professional_name} não atende às ${DAY_NAMES_PT[dayOfWeek]}s. 🔒\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*`;
            } else {
              const blocks = await prisma.scheduleBlock.findMany({ where: { professionalId: draft.professional_id, active: true } });
              const isBlocked = blocks.some((b) => {
                const start = toISODate(b.startDate);
                if (!start) return false;
                const end = toISODate(b.endDate) || start;
                return isoDate >= start && isoDate <= end;
              });

              if (isBlocked) {
                reply = `${draft.professional_name} não está disponível em *${formatDateBR(isoDate)}* (feriado ou bloqueio de agenda).\n\n👇 *Digite outra data* no formato *DD/MM/AAAA*`;
              } else {
                const apts = await prisma.appointment.findMany({
                  where: { appointmentDate: new Date(isoDate), professionalId: draft.professional_id },
                });
                const bookedTimes = apts
                  .filter((a) => !['cancelled', 'null_absence'].includes(a.status))
                  .map((a) => a.appointmentTime);

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
        const idx = parseInt(choice, 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= slots.length) {
          const lista = slots.map((s, i) => `${i + 1}️⃣ ${s}`).join('\n');
          reply = `⚠️ Opção inválida.\n\n${lista}\n\n👇 *Digite o número* do horário desejado:`;
        } else {
          draft.time = slots[idx];
          if (patientByPhone) {
            reply = `Encontrei seu cadastro! ✅\n\n👤 *${patientByPhone.fullName}*\n📱 ${patientByPhone.phone}\n\nSeus dados estão corretos?\n\n1️⃣ Sim, estão corretos\n2️⃣ Não, quero usar outros dados\n\n👇 *Digite 1 ou 2:*`;
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
          draft.patient_name = patientByPhone.fullName;
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
          const nomeNorm = draft.patient_name.toLowerCase();
          const first = nomeNorm.split(' ')[0];
          const last = nomeNorm.split(' ').pop();
          const found = allPatients.find((p) => p.fullName && p.fullName.toLowerCase().includes(first) && p.fullName.toLowerCase().includes(last));
          if (found && found.phone !== phoneNorm) {
            draft.found_patient_id = found.id;
            draft.found_patient_name = found.fullName;
            reply = `Encontrei um cadastro com nome similar:\n\n👤 *${found.fullName}*\n\nÉ você?\n\n1️⃣ Sim, sou eu\n2️⃣ Não, sou outra pessoa\n\n👇 *Digite 1 ou 2:*`;
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
          const cpfFound = allPatients.find((p) => p.cpf && p.cpf.replace(/\D/g, '') === cpf);
          if (cpfFound) {
            draft.patient_id = cpfFound.id;
            draft.patient_name = cpfFound.fullName;
            reply = `✅ CPF encontrado! Cadastro localizado:\n\n👤 *${cpfFound.fullName}*\n\nConfirme o agendamento:\n\n📅 *Data:* ${formatDateBR(draft.date)}\n⏰ *Horário:* ${draft.time}\n👨‍⚕️ *Profissional:* ${draft.professional_name}\n\n1️⃣ ✅ Confirmar agendamento\n2️⃣ ❌ Cancelar\n\n👇 *Digite 1 para confirmar ou 2 para cancelar:*`;
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
          reply = `✅ Cadastro quase pronto!\n\nResumo dos seus dados:\n👤 *Nome:* ${draft.patient_name}\n🪪 *CPF:* ${draft.patient_cpf}\n🎂 *Nascimento:* ${dateMatchBirth[0]}\n\nSeus dados estão corretos?\n\n1️⃣ ✅ Sim, continuar\n2️⃣ ✏️ Corrigir dados\n\n👇 *Digite 1 para continuar ou 2 para corrigir:*`;
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
            const newPatient = await prisma.patient.create({
              data: {
                fullName: draft.patient_name,
                cpf: draft.patient_cpf || null,
                birthDate: draft.patient_birth ? new Date(draft.patient_birth) : undefined,
                phone: phoneNorm,
                active: true,
              },
            });
            patientId = newPatient.id;
          }

          await prisma.appointment.create({
            data: {
              patientId,
              professionalId: draft.professional_id,
              appointmentDate: new Date(draft.date),
              appointmentTime: draft.time,
              status: 'confirmed',
              duration: 60,
            },
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
        const idx = parseInt(choice, 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= aptIds.length) {
          reply = `⚠️ Opção inválida.\n\n👇 *Digite o número* da consulta que deseja cancelar:`;
        } else {
          await prisma.appointment.update({ where: { id: aptIds[idx] }, data: { status: 'cancelled' } });
          reply = `✅ Consulta cancelada com sucesso.\n\n👇 *Digite menu* para voltar ao início.`;
          state = { step: 'MENU' };
        }
        break;
      }

      case 'CANCELAR_CPF': {
        const cpf = message.replace(/\D/g, '');
        const found = allPatients.find((p) => p.cpf && p.cpf.replace(/\D/g, '') === cpf);
        if (!found) {
          reply = `CPF não encontrado. Verifique e tente novamente.\n\n👇 *Digite seu CPF* ou *menu* para voltar:`;
        } else {
          const today = todayBrasilia();
          const apts = await prisma.appointment.findMany({ where: { patientId: found.id } });
          const futuras = apts.filter((a) => toISODate(a.appointmentDate) >= today && !['cancelled', 'completed'].includes(a.status));
          if (futuras.length === 0) {
            reply = `Não há consultas futuras para cancelar.\n\n👇 *Digite menu* para voltar ao início.`;
            state = { step: 'MENU' };
          } else {
            const lista = futuras.map((a, i) => {
              const prof = professionals.find((p) => p.id === a.professionalId);
              return `${i + 1}️⃣ ${formatDateBR(a.appointmentDate)} às ${a.appointmentTime} com ${prof?.fullName || 'N/A'}`;
            }).join('\n');
            reply = `Qual consulta deseja cancelar?\n\n${lista}\n\n👇 *Digite o número* da consulta que deseja cancelar:`;
            state = { step: 'AGUARDA_CANCELAR', aptIds: futuras.map((a) => a.id) };
          }
        }
        break;
      }

      default: {
        const nome = patientByPhone ? `, ${patientByPhone.fullName.split(' ')[0]}` : '';
        reply = `Olá${nome}! 👋\n\n${MENU_TEXT}`;
        state = { step: 'AGUARDA_MENU' };
      }
    }
  }

  if (msg === 'menu' && !['MENU', 'AGUARDA_MENU'].includes(state.step)) {
    reply = MENU_TEXT;
    state = { step: 'AGUARDA_MENU' };
    draft = {};
  }

  const updatedMessages = [
    ...(conversation?.messages || []).slice(-18),
    { role: 'user', content: message, timestamp: nowIso },
    { role: 'assistant', content: reply, timestamp: nowIso },
  ];

  const saveData = {
    messages: updatedMessages,
    lastActive: now,
    state,
    draft,
    patientId: patientByPhone ? patientByPhone.id : (conversation?.patientId ?? undefined),
  };

  if (conversation) {
    await prisma.whatsAppConversation.update({ where: { id: conversation.id }, data: saveData });
  } else {
    await prisma.whatsAppConversation.create({ data: { phone: phoneNorm, sessionId: sessionKey, ...saveData } });
  }

  return { reply, phone: phoneNorm, sessionId: sessionKey };
}
