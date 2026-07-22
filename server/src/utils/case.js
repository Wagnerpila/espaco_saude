const snakeToCamel = (str) => str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const camelToSnake = (str) => str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const META_FIELDS = new Set(['id', 'created_date', 'updated_date', 'created_by']);

// Converte um payload recebido do frontend (snake_case, estilo base44) para o
// formato aceito pelo Prisma Client (camelCase). Só converte as chaves de
// primeiro nível — o conteúdo de campos JSON opacos (working_hours, permissions,
// messages, etc.) é preservado como está, pois é definido pelo próprio frontend.
export function requestToPrisma(body, { dateFields = [] } = {}) {
  const out = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (META_FIELDS.has(key)) continue;
    out[snakeToCamel(key)] = value;
  }
  // Campos de chave estrangeira opcionais (ex.: patient_id, appointment_id)
  // vêm como "" quando o formulário não seleciona nada (padrão dos <Select>
  // da UI) — "" não é um id válido, então o Postgres rejeita por violação de
  // FK e a criação falha inteira, silenciosamente, pra qualquer entidade que
  // tenha um relacionamento opcional não preenchido (ex.: nova transação
  // financeira sem paciente/profissional/agendamento vinculado).
  for (const key of Object.keys(out)) {
    if (key !== 'id' && key.endsWith('Id') && out[key] === '') {
      out[key] = null;
    }
  }
  for (const field of dateFields) {
    const camelKey = snakeToCamel(field);
    if (!(camelKey in out)) continue;
    const value = out[camelKey];
    // Campo de data enviado vazio (ex.: paciente sem data de nascimento)
    // precisa virar `null`, não ficar como string vazia — o Prisma rejeita
    // "" para uma coluna DateTime e o create/update falha com 500.
    if (value === undefined || value === null || value === '') {
      out[camelKey] = null;
      continue;
    }
    out[camelKey] = Array.isArray(value) ? value.map((v) => new Date(v)) : new Date(value);
  }
  return out;
}

function toDateOnlyString(date) {
  // Campos @db.Date do Postgres não têm fuso — o Prisma devolve meia-noite
  // UTC, então usar os getters locais aqui erraria o dia pra quem está a
  // oeste de UTC (ex.: Brasil). slice direto na ISO evita isso.
  return date.toISOString().slice(0, 10);
}

// Converte uma linha do Prisma (camelCase) de volta para snake_case, no
// formato que os componentes existentes já esperam (compatível com base44).
// `dateFields` (snake_case, mesma lista de ENTITY_MAP) formata campos
// @db.Date como "YYYY-MM-DD" em vez do ISO completo que o JSON.stringify
// geraria por padrão — sem isso, telas que comparam essas datas com
// igualdade exata de string (ex.: agenda) nunca encontram os registros,
// mesmo eles existindo no banco.
export function prismaToResponse(row, dateFields = []) {
  if (!row || typeof row !== 'object') return row;
  if (Array.isArray(row)) return row.map((r) => prismaToResponse(r, dateFields));
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[camelToSnake(key)] = value;
  }
  if (out.created_at) out.created_date = out.created_at;
  if (out.updated_at) out.updated_date = out.updated_at;

  for (const field of dateFields) {
    const value = out[field];
    if (value instanceof Date) {
      out[field] = toDateOnlyString(value);
    } else if (Array.isArray(value)) {
      out[field] = value.map((v) => (v instanceof Date ? toDateOnlyString(v) : v));
    }
  }
  return out;
}
