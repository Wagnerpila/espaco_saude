// Decide como chamar um agendamento nas mensagens de WhatsApp — Pilates não é
// "consulta", é "sessão"; Fisioterapia continua "consulta"; qualquer outro
// serviço (Estética, etc.) usa o termo neutro "atendimento". Classifica por
// palavra-chave no texto livre do serviço, com fallback pra especialidade do
// profissional quando o agendamento não tem service_type preenchido (ex.:
// agendamentos feitos pelo bot).
export function getAppointmentWords(serviceType, specialty) {
  const text = `${serviceType || ''} ${specialty || ''}`.toLowerCase();

  if (text.includes('pilates')) {
    return { noun: 'sessão', article: 'Sua', articleIndef: 'uma', confirmedWord: 'confirmada' };
  }
  if (text.includes('fisio')) {
    return { noun: 'consulta', article: 'Sua', articleIndef: 'uma', confirmedWord: 'confirmada' };
  }
  return { noun: 'atendimento', article: 'Seu', articleIndef: 'um', confirmedWord: 'confirmado' };
}
