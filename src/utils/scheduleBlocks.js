// Avalia se um ScheduleBlock (full_day / partial_day / recurring_exception)
// se aplica a uma data+hora específica. Centralizado aqui porque a checagem
// precisa considerar bloqueios recorrentes (ex: toda quinta das 16h às 18h),
// não só a igualdade exata de start_date usada antes em AppointmentForm.

function isBlockActiveOnDate(block, dateStr) {
  if (block.start_date && dateStr < block.start_date) return false;

  // full_day/partial_day sem "Data de Término" preenchida significa "só esse
  // dia" (é assim que o form trata, deixando o campo em branco) — sem essa
  // regra, dateStr > null nunca é true e o bloqueio de um dia só vazava pra
  // todas as datas futuras. Já um bloqueio recorrente sem end_date É pra
  // valer indefinidamente a partir do start_date (o form nem mostra esse
  // campo pra recorrência), então mantém o comportamento em aberto.
  const endDate = block.end_date || (block.block_type === "recurring_exception" ? null : block.start_date);
  if (endDate && dateStr > endDate) return false;
  return true;
}

// Sem start_time/end_time definidos o bloqueio vale o dia inteiro.
function isTimeWithinBlock(block, timeStr) {
  if (!block.start_time || !block.end_time) return true;
  return timeStr >= block.start_time && timeStr < block.end_time;
}

function blockAppliesToDate(block, dateStr) {
  if (block.block_type === "full_day" || block.block_type === "partial_day") {
    return isBlockActiveOnDate(block, dateStr);
  }

  if (block.block_type === "recurring_exception") {
    if (!isBlockActiveOnDate(block, dateStr)) return false;

    const dateObj = new Date(`${dateStr}T00:00:00`);

    if (block.recurring_pattern === "weekly") {
      return (block.recurring_days || []).includes(dateObj.getDay());
    }
    if (block.recurring_pattern === "monthly") {
      return (block.recurring_days || []).includes(dateObj.getDate());
    }
    if (block.recurring_pattern === "custom") {
      return (block.custom_dates || []).includes(dateStr);
    }
    return false;
  }

  return false;
}

// Retorna o primeiro bloqueio ativo que cobre a data (e, se informado, o
// horário) dentre uma lista de bloqueios já filtrada por profissional/active.
export function findMatchingScheduleBlock(blocks, dateStr, timeStr) {
  return blocks.find((block) => {
    if (!blockAppliesToDate(block, dateStr)) return false;
    if (timeStr == null) return true;
    return isTimeWithinBlock(block, timeStr);
  }) || null;
}
