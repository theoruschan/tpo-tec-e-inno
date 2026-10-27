/**
 * Extrae datos de un anuncio a partir del texto leído de una captura (OCR).
 * Es heurístico y conservador: devuelve solo lo que encuentra con un patrón claro,
 * para que el estudiante revise y confirme antes de usarlo.
 */

export interface ExtractedListingData {
  monthlyRentArs?: number;
  depositRequestedArs?: number;
  ownerPhone?: string;
  cbuOrAlias?: string;
  /** Solo para CBU/CVU de 22 dígitos: si los dígitos verificadores cierran. */
  cbuChecksumValid?: boolean;
  ownerName?: string;
  listingUrl?: string;
  zoneId?: string;
  requestsAdvanceBeforeVisit?: boolean;
  /** Se vieron montos en dólares: no se usan como alquiler en pesos. */
  foreignCurrencyDetected?: boolean;
}

export type ZoneKeywords = Record<string, string[]>;

const MIN_PLAUSIBLE_ARS = 30000;
const MAX_PLAUSIBLE_ARS = 5000000;

const DEPOSIT_CONTEXT = /(seña|sena|reserva|reservar|adelanto|anticipo|dep[oó]sito|para guardar)/;
const RENT_CONTEXT = /(alquiler|mensual|por mes|x mes|\/ ?mes|al mes|precio|valor|cuota)/;
const EXCLUDED_CONTEXT = /(expensas|gastos|luz|gas|internet|usd|us\$|u\$s|d[oó]lares)/;

const DOMAIN_SUFFIX = /\.(com|ar|net|org|html?|php|io|app|edu|gob|gov)$/;
const ALIAS_KEYWORD = /alias\s*(?:cbu|cvu|mp)?\s*[:=-]?\s*([a-z0-9][a-z0-9.-]{4,18}[a-z0-9])/i;

/** Saca tildes para comparar palabras clave sin importar la ortografía del OCR. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Verifica los dos dígitos de control de un CBU/CVU (algoritmo del BCRA). */
export function isValidCbu(digits: string): boolean {
  if (!/^\d{22}$/.test(digits)) return false;
  const check = (block: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + Number(block[i]) * w, 0);
    return (10 - (sum % 10)) % 10;
  };
  const first = digits.slice(0, 8);
  const second = digits.slice(8);
  return (
    check(first, [7, 1, 3, 9, 7, 1, 3]) === Number(first[7]) &&
    check(second, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(second[13])
  );
}

interface AmountMatch {
  value: number;
  index: number;
  context: string;
}

function parseAmounts(text: string): { amounts: AmountMatch[]; foreign: boolean } {
  const folded = fold(text);
  const amounts: AmountMatch[] = [];
  let foreign = false;

  // "$ 230.000", "$230000", "ARS 230,000" (el OCR a veces lee "$" como "S")
  const currency = /(?:\$|ars|\bs)\s?(\d{1,3}(?:[.,\s]\d{3})+|\d{4,7})(?![\d.,]*\s*(?:usd|dolares))/g;
  // "230 mil", "230k"
  const thousands = /\b(\d{2,4})\s?(?:mil\b|k\b)/g;

  for (const [regex, multiplier] of [
    [currency, 1],
    [thousands, 1000],
  ] as const) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(folded)) !== null) {
      const value = Number(match[1].replace(/[.,\s]/g, '')) * multiplier;
      const context = folded.slice(Math.max(0, match.index - 45), match.index);
      const after = folded.slice(match.index, match.index + match[0].length + 8);
      if (/usd|us\$|u\$s|dolar/.test(context.slice(-12) + after)) {
        foreign = true;
        continue;
      }
      if (value < MIN_PLAUSIBLE_ARS || value > MAX_PLAUSIBLE_ARS) continue;
      if (amounts.some((a) => Math.abs(a.index - match!.index) < 3)) continue;
      amounts.push({ value, index: match.index, context });
    }
  }

  if (/\b(usd|us\$|u\$s|dolares)\b/.test(folded)) foreign = true;
  return { amounts: amounts.sort((a, b) => a.index - b.index), foreign };
}

function lastKeywordMatch(context: string, regex: RegExp): number {
  let last = -1;
  const global = new RegExp(regex.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = global.exec(context)) !== null) last = m.index;
  return last;
}

/** Clasifica cada monto según la palabra clave más cercana que lo precede. */
function classifyAmounts(amounts: AmountMatch[]) {
  let rent: number | undefined;
  let deposit: number | undefined;
  const unlabeled: number[] = [];

  for (const amount of amounts) {
    const depositAt = lastKeywordMatch(amount.context, DEPOSIT_CONTEXT);
    const rentAt = lastKeywordMatch(amount.context, RENT_CONTEXT);
    const excludedAt = lastKeywordMatch(amount.context, EXCLUDED_CONTEXT);
    const nearest = Math.max(depositAt, rentAt, excludedAt);

    if (nearest === -1) {
      unlabeled.push(amount.value);
    } else if (nearest === excludedAt) {
      continue;
    } else if (nearest === depositAt) {
      deposit ??= amount.value;
    } else {
      rent ??= amount.value;
    }
  }

  if (rent === undefined && unlabeled.length > 0) {
    // Sin palabra clave: el monto más alto suele ser el alquiler.
    rent = Math.max(...unlabeled);
  }
  if (deposit !== undefined && rent === deposit) deposit = undefined;
  return { rent, deposit };
}

function findCbu(text: string): { value: string; valid: boolean } | undefined {
  const candidates = text.match(/(?:\d[\s-]?){21}\d/g) ?? [];
  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 22) return { value: digits, valid: isValidCbu(digits) };
  }
  return undefined;
}

function findAlias(text: string): string | undefined {
  const keyword = text.match(ALIAS_KEYWORD);
  if (keyword) return keyword[1].toLowerCase().replace(/\.$/, '');

  const folded = text.toLowerCase();
  const tokens = folded.match(/\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+){1,4}\b/g) ?? [];
  return tokens.find(
    (token) =>
      token.length >= 6 &&
      token.length <= 20 &&
      /[a-z]/.test(token) &&
      !DOMAIN_SUFFIX.test(token) &&
      !token.startsWith('www.') &&
      !folded.includes(`@${token}`) &&
      !folded.includes(`${token}@`) &&
      !/^\d+(\.\d+)*$/.test(token)
  );
}

function findPhone(text: string, excludeDigits: string[]): string | undefined {
  const waLink = text.match(/wa\.me\/(\d{10,13})/i);
  if (waLink) return `+${waLink[1]}`;

  const candidates = text.match(/(?:\+?54[\s-]?)?(?:9[\s-]?)?(?:\(?0?\d{2,4}\)?[\s-]?)?(?:15[\s-]?)?\d{3,4}[\s-]?\d{4}\b/g) ?? [];
  const folded = fold(text);
  let best: { value: string; score: number } | undefined;

  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 13) continue;
    if (excludeDigits.some((d) => d.includes(digits))) continue;
    const at = text.indexOf(raw);
    const before = folded.slice(Math.max(0, at - 25), at);
    if (/[$]\s?$|ars\s?$/.test(before)) continue; // es un monto
    const score =
      (/(tel|whatsapp|wsp|wpp|cel|contacto|llama|escrib)/.test(before) ? 2 : 0) +
      (raw.trim().startsWith('+') || digits.startsWith('54') ? 1 : 0);
    if (!best || score > best.score) best = { value: raw.trim(), score };
  }
  return best?.value;
}

function findName(text: string): string | undefined {
  const match = text.match(
    // Palabra clave sin importar mayúsculas; el nombre sí tiene que venir capitalizado.
    /(?:[Tt]itular|[Aa] nombre de|[Dd]ue[ñn]o|[Pp]ropietari[oa]|[Nn]ombre|[Mm]e llamo|[Ss]oy)[ \t]*[:-]?[ \t]*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/
  );
  return match?.[1];
}

function findUrl(text: string): string | undefined {
  const match = text.match(
    /(?:https?:\/\/|www\.)\S+|(?:facebook|zonaprop|argenprop|mercadolibre|instagram)\.[a-z.]+\/\S+/i
  );
  return match?.[0].replace(/[),.;]+$/, '');
}

function findZone(text: string, zoneKeywords: ZoneKeywords): string | undefined {
  const folded = fold(text);
  let best: { id: string; at: number } | undefined;
  for (const [zoneId, keywords] of Object.entries(zoneKeywords)) {
    for (const keyword of keywords) {
      const at = folded.indexOf(fold(keyword));
      if (at >= 0 && (!best || at < best.at)) best = { id: zoneId, at };
    }
  }
  return best?.id;
}

function detectsAdvanceBeforeVisit(text: string): boolean {
  const folded = fold(text);
  return (
    /(sena|reserv\w*|transfer\w*|adelant\w*).{0,60}(antes de (ver|visitar|conocer)|sin (ver|visita|visitar))/.test(folded) ||
    /(no (se )?(puede|podes|puedo) (ver|visitar|mostrar))|(estoy (de viaje|en el interior|afuera))/.test(folded)
  );
}

export class ListingTextExtractor {
  constructor(private readonly zoneKeywords: ZoneKeywords = {}) {}

  public extract(rawText: string): ExtractedListingData {
    const text = rawText.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
    const result: ExtractedListingData = {};

    const { amounts, foreign } = parseAmounts(text);
    const { rent, deposit } = classifyAmounts(amounts);
    if (rent !== undefined) result.monthlyRentArs = rent;
    if (deposit !== undefined) result.depositRequestedArs = deposit;
    if (foreign) result.foreignCurrencyDetected = true;

    const cbu = findCbu(text);
    if (cbu) {
      result.cbuOrAlias = cbu.value;
      result.cbuChecksumValid = cbu.valid;
    } else {
      const alias = findAlias(text);
      if (alias) result.cbuOrAlias = alias;
    }

    const phone = findPhone(text, cbu ? [cbu.value] : []);
    if (phone) result.ownerPhone = phone;

    const name = findName(text);
    if (name) result.ownerName = name;

    const url = findUrl(text);
    if (url) result.listingUrl = url;

    const zoneId = findZone(text, this.zoneKeywords);
    if (zoneId) result.zoneId = zoneId;

    if (detectsAdvanceBeforeVisit(text)) result.requestsAdvanceBeforeVisit = true;

    return result;
  }
}
