import { prisma } from '../db.js';

// Confirmação de agendamento personalizada por especialidade do profissional
// ou pelo profissional específico (ver model AppointmentConfirmationOverride
// no schema, e functions/appointmentConfirmationOverrides.js pro CRUD usado
// pela tela de admin). Um override de profissional tem prioridade sobre um
// de especialidade; nenhum dos dois existindo, quem manda é o texto/imagem
// padrão de APPOINTMENT_CONFIRMATION_NOTIFICATION (ou a variação por serviço
// "Depilação a LED", ver isDepilacaoLed em appointmentNotifications.js) —
// nessa ordem de prioridade: profissional > especialidade > serviço > padrão.
//
// `template` pode ser nulo mesmo com override: significa "use o texto padrão
// da confirmação, só troca a imagem" — não precisa duplicar o texto em cada
// especialidade/profissional pra só trocar a foto.
export async function resolveConfirmationOverride({ professionalId, specialty }) {
  const [byProfessional, bySpecialty] = await Promise.all([
    professionalId
      ? prisma.appointmentConfirmationOverride.findUnique({ where: { scope_scopeValue: { scope: 'professional', scopeValue: professionalId } } })
      : null,
    specialty
      ? prisma.appointmentConfirmationOverride.findUnique({ where: { scope_scopeValue: { scope: 'specialty', scopeValue: specialty } } })
      : null,
  ]);

  return byProfessional || bySpecialty || null;
}
