import { prisma } from '../db.js';
import { formatPhone, todayBrasilia } from '../utils/format.js';
import { loadMessageRenderer } from './whatsappMessages.js';

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
  const t = await loadMessageRenderer();
  const menuText = t('MENU_OPTIONS');
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
    reply = t('GREETING_MENU', { first_name: nome, menu: menuText });
    state = { step: 'AGUARDA_MENU' };
    draft = {};
  } else {
    switch (state.step) {
      case 'MENU': {
        const nome = patientByPhone ? `, ${patientByPhone.fullName.split(' ')[0]}` : '';
        reply = t('MENU', { first_name: nome, menu: menuText });
        state = { step: 'AGUARDA_MENU' };
        break;
      }

      case 'AGUARDA_MENU': {
        if (choice === '1') {
          const lista = activeProfessionals.map((p, i) => t('LIST_ITEM_PROFESSIONAL', { i: i + 1, name: p.fullName, specialty: p.specialty })).join('\n');
          reply = t('CHOOSE_PROFESSIONAL', { list: lista });
          state = { step: 'AGUARDA_PROFISSIONAL', profList: activeProfessionals.map((p) => p.id) };
        } else if (choice === '2') {
          if (!patientByPhone) {
            reply = t('ASK_CPF_TO_CANCEL');
            state = { step: 'CANCELAR_CPF' };
          } else {
            const today = todayBrasilia();
            const apts = await prisma.appointment.findMany({ where: { patientId: patientByPhone.id } });
            const futuras = apts.filter((a) => toISODate(a.appointmentDate) >= today && !['cancelled', 'completed'].includes(a.status));
            if (futuras.length === 0) {
              reply = t('NO_APPOINTMENTS_TO_CANCEL');
              state = { step: 'MENU' };
            } else {
              const lista = futuras.map((a, i) => {
                const prof = professionals.find((p) => p.id === a.professionalId);
                return t('LIST_ITEM_APPOINTMENT', { i: i + 1, date: formatDateBR(a.appointmentDate), time: a.appointmentTime, professional_name: prof?.fullName || 'N/A' });
              }).join('\n');
              reply = t('CHOOSE_APPOINTMENT_TO_CANCEL', { list: lista });
              state = { step: 'AGUARDA_CANCELAR', aptIds: futuras.map((a) => a.id) };
            }
          }
        } else if (choice === '3') {
          reply = t('SERVICES_INFO');
          state = { step: 'AGUARDA_MENU' };
        } else if (choice === '4') {
          reply = t('TRANSFER_TO_ATTENDANT');
          const attendantUntil = new Date(Date.now() + ATTENDANT_TIMEOUT_MS).toISOString();
          state = { step: 'MENU', attendant_mode_until: attendantUntil };
        } else {
          reply = t('MENU_INVALID', { menu: menuText });
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
          const lista = orderedProfs.map((p, i) => t('LIST_ITEM_PROFESSIONAL', { i: i + 1, name: p.fullName, specialty: p.specialty })).join('\n');
          reply = t('INVALID_PROFESSIONAL_CHOICE', { list: lista });
        } else {
          const prof = orderedProfs[idx];
          draft.professional_id = prof.id;
          draft.professional_name = prof.fullName;
          reply = t('PROFESSIONAL_SELECTED', { professional_name: prof.fullName });
          state = { step: 'AGUARDA_DATA' };
        }
        break;
      }

      case 'AGUARDA_DATA': {
        const dateMatch = message.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dateMatch) {
          reply = t('INVALID_DATE_FORMAT');
        } else {
          const isoDate = parseDateBR(message);
          const dayOfWeek = getDayOfWeek(isoDate);
          const today = todayBrasilia();

          if (isoDate < today) {
            reply = t('DATE_IN_PAST');
          } else if (dayOfWeek === 0) {
            reply = t('CLOSED_SUNDAY');
          } else {
            const profissional = professionals.find((p) => p.id === draft.professional_id);
            const dayConfig = getProfessionalDaySchedule(profissional, dayOfWeek);

            if (!dayConfig) {
              reply = t('PROFESSIONAL_NOT_AVAILABLE_WEEKDAY', { professional_name: draft.professional_name, day_name: DAY_NAMES_PT[dayOfWeek] });
            } else {
              const blocks = await prisma.scheduleBlock.findMany({ where: { professionalId: draft.professional_id, active: true } });
              const isBlocked = blocks.some((b) => {
                const start = toISODate(b.startDate);
                if (!start) return false;
                const end = toISODate(b.endDate) || start;
                return isoDate >= start && isoDate <= end;
              });

              if (isBlocked) {
                reply = t('PROFESSIONAL_BLOCKED_DATE', { professional_name: draft.professional_name, date: formatDateBR(isoDate) });
              } else {
                const apts = await prisma.appointment.findMany({
                  where: { appointmentDate: new Date(isoDate), professionalId: draft.professional_id },
                });
                const bookedTimes = apts
                  .filter((a) => !['cancelled', 'null_absence'].includes(a.status))
                  .map((a) => a.appointmentTime);

                const slots = getAvailableSlots(dayConfig, bookedTimes);

                if (slots.length === 0) {
                  reply = t('NO_SLOTS_AVAILABLE', { date: formatDateBR(isoDate), professional_name: draft.professional_name });
                } else {
                  draft.date = isoDate;
                  const lista = slots.map((s, i) => t('LIST_ITEM_SLOT', { i: i + 1, time: s })).join('\n');
                  reply = t('SLOTS_AVAILABLE', { date: formatDateBR(isoDate), professional_name: draft.professional_name, list: lista, start: dayConfig.start, end: dayConfig.end });
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
          const lista = slots.map((s, i) => t('LIST_ITEM_SLOT', { i: i + 1, time: s })).join('\n');
          reply = t('INVALID_SLOT_CHOICE', { list: lista });
        } else {
          draft.time = slots[idx];
          if (patientByPhone) {
            reply = t('FOUND_REGISTRATION', { patient_name: patientByPhone.fullName, patient_phone: patientByPhone.phone });
            state = { step: 'CONFIRMA_PACIENTE' };
          } else {
            reply = t('NOT_FOUND_QUICK_REGISTER');
            state = { step: 'CADASTRO_NOME' };
          }
        }
        break;
      }

      case 'CONFIRMA_PACIENTE': {
        if (choice === '1') {
          draft.patient_id = patientByPhone.id;
          draft.patient_name = patientByPhone.fullName;
          reply = t('CONFIRM_APPOINTMENT_SUMMARY', { date: formatDateBR(draft.date), time: draft.time, professional_name: draft.professional_name, patient_name: draft.patient_name });
          state = { step: 'CONFIRMA_AGENDAMENTO' };
        } else if (choice === '2') {
          reply = t('USE_OTHER_DATA');
          state = { step: 'CADASTRO_NOME' };
        } else {
          reply = t('ASK_1_OR_2_CORRECT_DATA');
        }
        break;
      }

      case 'CADASTRO_NOME': {
        if (message.trim().length < 3) {
          reply = t('NAME_TOO_SHORT');
        } else {
          draft.patient_name = message.trim();
          const nomeNorm = draft.patient_name.toLowerCase();
          const first = nomeNorm.split(' ')[0];
          const last = nomeNorm.split(' ').pop();
          const found = allPatients.find((p) => p.fullName && p.fullName.toLowerCase().includes(first) && p.fullName.toLowerCase().includes(last));
          if (found && found.phone !== phoneNorm) {
            draft.found_patient_id = found.id;
            draft.found_patient_name = found.fullName;
            reply = t('FOUND_SIMILAR_NAME', { found_name: found.fullName });
            state = { step: 'CONFIRMA_PACIENTE_NOME' };
          } else {
            reply = t('NAME_REGISTERED_ASK_CPF', { patient_name: draft.patient_name });
            state = { step: 'CADASTRO_CPF' };
          }
        }
        break;
      }

      case 'CONFIRMA_PACIENTE_NOME': {
        if (choice === '1') {
          draft.patient_id = draft.found_patient_id;
          draft.patient_name = draft.found_patient_name;
          reply = t('CONFIRM_APPOINTMENT_SUMMARY', { date: formatDateBR(draft.date), time: draft.time, professional_name: draft.professional_name, patient_name: draft.patient_name });
          state = { step: 'CONFIRMA_AGENDAMENTO' };
        } else if (choice === '2') {
          reply = t('CONTINUE_REGISTER_ASK_CPF');
          state = { step: 'CADASTRO_CPF' };
        } else {
          reply = t('ASK_1_OR_2_IS_YOU');
        }
        break;
      }

      case 'CADASTRO_CPF': {
        const cpf = message.replace(/\D/g, '');
        if (cpf.length !== 11) {
          reply = t('INVALID_CPF');
        } else {
          const cpfFound = allPatients.find((p) => p.cpf && p.cpf.replace(/\D/g, '') === cpf);
          if (cpfFound) {
            draft.patient_id = cpfFound.id;
            draft.patient_name = cpfFound.fullName;
            reply = t('CPF_FOUND_CONFIRM', { patient_name: cpfFound.fullName, date: formatDateBR(draft.date), time: draft.time, professional_name: draft.professional_name });
            state = { step: 'CONFIRMA_AGENDAMENTO' };
          } else {
            draft.patient_cpf = cpf;
            reply = t('CPF_REGISTERED_ASK_BIRTH');
            state = { step: 'CADASTRO_NASCIMENTO' };
          }
        }
        break;
      }

      case 'CADASTRO_NASCIMENTO': {
        const dateMatchBirth = message.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dateMatchBirth) {
          reply = t('INVALID_BIRTH_DATE');
        } else {
          draft.patient_birth = parseDateBR(message);
          reply = t('REGISTRATION_SUMMARY_CONFIRM', { patient_name: draft.patient_name, patient_cpf: draft.patient_cpf, birth_date: dateMatchBirth[0] });
          state = { step: 'CONFIRMA_CADASTRO' };
        }
        break;
      }

      case 'CONFIRMA_CADASTRO': {
        if (choice === '1') {
          reply = t('CONFIRM_APPOINTMENT_SUMMARY_PLAIN', { date: formatDateBR(draft.date), time: draft.time, professional_name: draft.professional_name, patient_name: draft.patient_name });
          state = { step: 'CONFIRMA_AGENDAMENTO' };
        } else if (choice === '2') {
          draft.patient_name = '';
          draft.patient_cpf = '';
          draft.patient_birth = '';
          reply = t('CORRECT_DATA_RESTART');
          state = { step: 'CADASTRO_NOME' };
        } else {
          reply = t('ASK_1_OR_2_CONTINUE_OR_CORRECT');
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

          reply = t('APPOINTMENT_CONFIRMED', { date: formatDateBR(draft.date), time: draft.time, professional_name: draft.professional_name, patient_name: draft.patient_name });
          state = { step: 'MENU' };
          draft = {};
        } else if (choice === '2') {
          reply = t('APPOINTMENT_CANCELLED_BY_USER');
          state = { step: 'MENU' };
          draft = {};
        } else {
          reply = t('ASK_1_OR_2_CONFIRM_OR_CANCEL');
        }
        break;
      }

      case 'AGUARDA_CANCELAR': {
        const aptIds = state.aptIds || [];
        const idx = parseInt(choice, 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= aptIds.length) {
          reply = t('INVALID_CANCEL_APPOINTMENT_CHOICE');
        } else {
          await prisma.appointment.update({ where: { id: aptIds[idx] }, data: { status: 'cancelled' } });
          reply = t('APPOINTMENT_CANCELLED_SUCCESS');
          state = { step: 'MENU' };
        }
        break;
      }

      case 'CANCELAR_CPF': {
        const cpf = message.replace(/\D/g, '');
        const found = allPatients.find((p) => p.cpf && p.cpf.replace(/\D/g, '') === cpf);
        if (!found) {
          reply = t('CPF_NOT_FOUND');
        } else {
          const today = todayBrasilia();
          const apts = await prisma.appointment.findMany({ where: { patientId: found.id } });
          const futuras = apts.filter((a) => toISODate(a.appointmentDate) >= today && !['cancelled', 'completed'].includes(a.status));
          if (futuras.length === 0) {
            reply = t('NO_APPOINTMENTS_TO_CANCEL');
            state = { step: 'MENU' };
          } else {
            const lista = futuras.map((a, i) => {
              const prof = professionals.find((p) => p.id === a.professionalId);
              return t('LIST_ITEM_APPOINTMENT', { i: i + 1, date: formatDateBR(a.appointmentDate), time: a.appointmentTime, professional_name: prof?.fullName || 'N/A' });
            }).join('\n');
            reply = t('CHOOSE_APPOINTMENT_TO_CANCEL', { list: lista });
            state = { step: 'AGUARDA_CANCELAR', aptIds: futuras.map((a) => a.id) };
          }
        }
        break;
      }

      default: {
        const nome = patientByPhone ? `, ${patientByPhone.fullName.split(' ')[0]}` : '';
        reply = t('DEFAULT_FALLBACK', { first_name: nome, menu: menuText });
        state = { step: 'AGUARDA_MENU' };
      }
    }
  }

  if (msg === 'menu' && !['MENU', 'AGUARDA_MENU'].includes(state.step)) {
    reply = menuText;
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
