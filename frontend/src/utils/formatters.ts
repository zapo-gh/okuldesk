/**
 * Telefon numarasını Türkiye standart formatına dönüştürür: 0555 123 45 90
 */
export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  let clean = digits;
  // +90 5xx xxx xx xx -> 05xx...
  if (clean.startsWith('90') && clean.length === 12) {
    clean = '0' + clean.slice(2);
  } else if (clean.length === 10 && clean.startsWith('5')) {
    clean = '0' + clean;
  }

  // 11 haneli ve 0 ile başlayan (örn. 05551234590 -> 0555 123 45 90)
  if (clean.length === 11 && clean.startsWith('0')) {
    return clean.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }

  // 10 haneli (örn. 5551234590 -> 0555 123 45 90)
  if (clean.length === 10) {
    return `0${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
  }

  return trimmed;
}
