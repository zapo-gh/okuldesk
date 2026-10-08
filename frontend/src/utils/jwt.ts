/**
 * JWT token yardımcı fonksiyonları.
 * Sunucu doğrulamasına gerek kalmadan token expiry'yi istemci tarafında kontrol eder.
 */

/**
 * JWT payload'ını decode eder (doğrulamaz — yalnızca okuma amaçlı).
 */
function decodePayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded  = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Token'ın süresi dolmuş mu kontrol eder.
 * @param token JWT string
 * @param bufferSeconds Süresi dolmadan önce geçersiz sayılacak süre (saniye). Varsayılan: 60
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodePayload(token);
  if (!payload) return true;
  if (!payload.exp) return false;
  return Date.now() >= (payload.exp - bufferSeconds) * 1000;
}

/**
 * Token'ın ne zaman süreceğini döndürür (Date objesi olarak).
 */
export function getTokenExpiry(token: string): Date | null {
  const payload = decodePayload(token);
  if (!payload?.exp) return null;
  return new Date(payload.exp * 1000);
}
