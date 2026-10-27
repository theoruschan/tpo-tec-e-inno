import {
  ExperimentSampleCase,
  ExperimentSplit,
  GroundTruthLabel,
} from '../domain/entities/types';

/**
 * Carga un dataset propio de anuncios reales con su resultado real (ground truth)
 * para recalcular recall, precisión y accuracy. Formato documentado en docs/04.
 *
 * Columnas (CSV con encabezado, separador "," o ";", o JSON con un array de objetos
 * con las mismas claves):
 *   obligatorias: ground_truth, zone_id, monthly_rent_ars
 *   opcionales:   case_id, title, platform, what_happened, listing_url, deposit_ars,
 *                 owner_name, owner_phone, cbu_or_alias, account_age_months,
 *                 photo_count, image_dhash, known_image_id,
 *                 requests_advance_before_visit, is_registered_real_estate,
 *                 real_estate_license, split
 */

export const MAX_DATASET_ROWS = 500;

export interface ParsedExperimentDataset {
  samples: ExperimentSampleCase[];
  errors: string[];
}

type RawRow = Record<string, unknown>;

const GROUND_TRUTH_ALIASES: Record<string, GroundTruthLabel> = {
  fraud: 'FRAUD',
  estafa: 'FRAUD',
  trucho: 'FRAUD',
  legitimate: 'LEGITIMATE',
  legitimo: 'LEGITIMATE',
  legítimo: 'LEGITIMATE',
  real: 'LEGITIMATE',
  insufficient_data: 'INSUFFICIENT_DATA',
  sin_datos: 'INSUFFICIENT_DATA',
  'sin datos': 'INSUFFICIENT_DATA',
};

const SPLIT_ALIASES: Record<string, ExperimentSplit> = {
  calibration: 'calibration',
  calibracion: 'calibration',
  calibración: 'calibration',
  evaluation: 'evaluation',
  evaluacion: 'evaluation',
  evaluación: 'evaluation',
};

const TRUE_VALUES = new Set(['true', '1', 'si', 'sí', 'yes', 'x']);

/** CSV mínimo con soporte de comillas dobles (campos con separador o saltos de línea). */
export function parseCsv(text: string): string[][] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // BOM de Excel
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

export class ParseExperimentDatasetUseCase {
  constructor(private readonly validZoneIds: string[]) {}

  public execute(content: string, fileName = ''): ParsedExperimentDataset {
    const trimmed = content.trim();
    if (!trimmed) return { samples: [], errors: ['El archivo está vacío.'] };

    let rawRows: RawRow[];
    try {
      rawRows =
        fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('[')
          ? this.fromJson(trimmed)
          : this.fromCsv(trimmed);
    } catch (error) {
      return {
        samples: [],
        errors: [error instanceof Error ? error.message : 'No se pudo leer el archivo.'],
      };
    }

    if (rawRows.length > MAX_DATASET_ROWS) {
      return {
        samples: [],
        errors: [`El dataset tiene ${rawRows.length} filas; el máximo es ${MAX_DATASET_ROWS}.`],
      };
    }

    const samples: ExperimentSampleCase[] = [];
    const errors: string[] = [];
    const usedCaseNumbers = new Set<number>();

    rawRows.forEach((raw, index) => {
      const rowLabel = `Fila ${index + 2}`; // +1 por encabezado, +1 por base 1
      const result = this.toSample(raw, index + 1, usedCaseNumbers);
      if (typeof result === 'string') {
        errors.push(`${rowLabel}: ${result}`);
      } else {
        usedCaseNumbers.add(result.caseNumber);
        samples.push(result);
      }
    });

    if (samples.length === 0 && errors.length === 0) {
      errors.push('No se encontraron filas con datos.');
    }
    return { samples, errors };
  }

  private fromJson(text: string): RawRow[] {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('El JSON tiene que ser un array de anuncios.');
    }
    return parsed.map((item) => (item && typeof item === 'object' ? (item as RawRow) : {}));
  }

  private fromCsv(text: string): RawRow[] {
    const [header, ...rows] = parseCsv(text);
    if (!header) throw new Error('El CSV no tiene encabezado.');
    const keys = header.map((h) => h.trim().toLowerCase());
    return rows.map((cells) =>
      Object.fromEntries(keys.map((key, i) => [key, cells[i]?.trim() ?? '']))
    );
  }

  private toSample(
    raw: RawRow,
    position: number,
    usedCaseNumbers: Set<number>
  ): ExperimentSampleCase | string {
    const str = (key: string) => {
      const value = raw[key];
      return value === undefined || value === null ? '' : String(value).trim();
    };
    const num = (key: string, fallback = 0) => {
      // Enteros: se aceptan separadores de miles ("230.000", "230,000", "$ 230000").
      const value = str(key).replace(/[$\s.,]/g, '');
      if (!value) return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : NaN;
    };
    const bool = (key: string) => TRUE_VALUES.has(str(key).toLowerCase());

    const groundTruth = GROUND_TRUTH_ALIASES[str('ground_truth').toLowerCase()] ??
      (['FRAUD', 'LEGITIMATE', 'INSUFFICIENT_DATA'].includes(str('ground_truth').toUpperCase())
        ? (str('ground_truth').toUpperCase() as GroundTruthLabel)
        : undefined);
    if (!groundTruth) {
      return `ground_truth "${str('ground_truth')}" no es válido (usá FRAUD, LEGITIMATE o INSUFFICIENT_DATA).`;
    }

    const zoneId = str('zone_id');
    if (!this.validZoneIds.includes(zoneId)) {
      return `zone_id "${zoneId}" no existe. Valores posibles: ${this.validZoneIds.join(', ')}.`;
    }

    const monthlyRentArs = num('monthly_rent_ars', NaN);
    if (!Number.isFinite(monthlyRentArs) || monthlyRentArs <= 0) {
      return 'monthly_rent_ars tiene que ser un número mayor a 0.';
    }
    const depositRequestedArs = num('deposit_ars');
    const accountAgeMonths = num('account_age_months', 12);
    const photoCount = num('photo_count', 3);
    if ([depositRequestedArs, accountAgeMonths, photoCount].some((n) => !Number.isFinite(n) || n < 0)) {
      return 'deposit_ars, account_age_months y photo_count tienen que ser números ≥ 0.';
    }

    let caseNumber = num('case_id', position);
    if (!Number.isInteger(caseNumber) || usedCaseNumbers.has(caseNumber)) {
      caseNumber = position;
      while (usedCaseNumbers.has(caseNumber)) caseNumber += 1000;
    }

    const imageDHash = str('image_dhash').toLowerCase();
    if (imageDHash && !/^[0-9a-f]{16}$/.test(imageDHash)) {
      return 'image_dhash tiene que ser un hash de 16 caracteres hexadecimales.';
    }

    const splitRaw = str('split').toLowerCase();
    const split = splitRaw ? SPLIT_ALIASES[splitRaw] : undefined;
    if (splitRaw && !split) {
      return `split "${splitRaw}" no es válido (usá calibration o evaluation).`;
    }

    return {
      caseNumber,
      title: str('title') || `Anuncio ${caseNumber}`,
      platform: str('platform') || 'Sin especificar',
      groundTruth,
      whatActuallyHappened: str('what_happened') || 'Sin descripción',
      split,
      input: {
        id: `CSV-${caseNumber}`,
        listingUrlOrCapture: str('listing_url') || `dataset://anuncio-${caseNumber}`,
        zoneId,
        monthlyRentArs,
        depositRequestedArs,
        ownerName: str('owner_name'),
        ownerPhone: str('owner_phone'),
        cbuOrAlias: str('cbu_or_alias'),
        accountAgeMonths,
        photoCount,
        imageSignatureHash: str('known_image_id'),
        uploadedImageDHash: imageDHash || undefined,
        requestsAdvanceBeforeVisit: bool('requests_advance_before_visit'),
        isRegisteredRealEstate: bool('is_registered_real_estate'),
        realEstateLicense: str('real_estate_license') || undefined,
        authorizedProcessing: true,
      },
    };
  }
}
