import { normalizeIdentifier, normalizePhone } from './IdentityCbuMatcher';

/**
 * Versiones parciales para mostrar en la UI del directorio. Mismo criterio que
 * private.mask_identifier / private.mask_phone en la migración de Supabase.
 */
export function maskIdentifier(value: string): string {
  const normalized = normalizeIdentifier(value);
  if (!normalized) return '';
  if (normalized.includes('•')) return normalized; // ya viene enmascarado del servidor
  if (/^\d+$/.test(normalized)) {
    return '•'.repeat(Math.max(normalized.length - 4, 0)) + normalized.slice(-4);
  }
  if (normalized.length <= 6) return `${normalized.slice(0, 1)}•••`;
  return `${normalized.slice(0, 3)}•••${normalized.slice(-3)}`;
}

export function maskPhone(value: string | undefined): string {
  if (!value) return '';
  if (value.includes('•')) return value;
  const digits = normalizePhone(value);
  return digits ? `•••• ${digits.slice(-4)}` : '';
}
