// Avalia se um ScheduleBlock (full_day / partial_day / recurring_exception)
// se aplica a uma data+hora específica. Centralizado aqui porque a checagem
// precisa considerar bloqueios recorrentes (ex: toda quinta das 16h às 18h),
// não só a igualdade exata de start_date usada antes em AppointmentForm.

function isBlockActiveOnDate(block, dateStr) {
  if (block.start_date && dateStr < block.start_date) return false;
  if (block.end_date && dateStr > block.end_date) return false;
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
