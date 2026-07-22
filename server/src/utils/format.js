export function formatPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const iso = isoDate instanceof Date ? isoDate.toISOString().slice(0, 10) : String(isoDate).slice(0, 10);
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return String(isoDate);
  return `${d}/${m}/${y}`;
}

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function toISODate(date) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
}

export function todayBrasilia() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}
