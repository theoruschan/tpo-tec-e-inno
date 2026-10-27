import { FraudDirectoryEntry } from '../domain/entities/types';
import {
  DirectorySourceKind,
  FraudDirectoryRepository,
  FraudReportSubmission,
  InputIdentifierHashes,
  SubmitReportResult,
} from '../domain/ports/FraudDirectoryRepository';
import { LocalFraudDirectoryRepository } from './storage/LocalFraudDirectoryRepository';
import { SupabaseFraudDirectoryRepository } from './supabase/SupabaseFraudDirectoryRepository';

const REPORTER_ID_KEY = 'cuartoseguro_reporter_id_v1';

/**
 * Identificador anónimo del dispositivo para contar "reportes independientes".
 * Es aleatorio y se hashea con sal en el servidor; no identifica a la persona.
 * Límite conocido: borrar el localStorage genera otro id.
 */
export function getOrCreateReporterId(): string {
  try {
    const existing = window.localStorage.getItem(REPORTER_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(REPORTER_ID_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Usa el directorio compartido y, si la red o Supabase fallan, cae al localStorage
 * detrás de la misma interfaz. `kind` refleja qué fuente respondió la última vez.
 */
export class ResilientFraudDirectoryRepository implements FraudDirectoryRepository {
  private currentKind: DirectorySourceKind = 'shared';
  private readonly fallback = new LocalFraudDirectoryRepository('local-fallback');

  constructor(private readonly primary: FraudDirectoryRepository) {}

  public get kind(): DirectorySourceKind {
    return this.currentKind;
  }

  public async listActiveEntries(): Promise<FraudDirectoryEntry[]> {
    return this.withFallback(
      () => this.primary.listActiveEntries(),
      () => this.fallback.listActiveEntries()
    );
  }

  public async submitReport(report: FraudReportSubmission): Promise<SubmitReportResult> {
    return this.withFallback(
      () => this.primary.submitReport(report),
      () => this.fallback.submitReport(report)
    );
  }

  public async hashIdentifiers(
    cbuOrAlias: string,
    phone: string
  ): Promise<InputIdentifierHashes> {
    return this.withFallback(
      () => this.primary.hashIdentifiers(cbuOrAlias, phone),
      () => this.fallback.hashIdentifiers()
    );
  }

  private async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await primary();
      this.currentKind = 'shared';
      return result;
    } catch {
      this.currentKind = 'local-fallback';
      return fallback();
    }
  }
}

export function createFraudDirectoryRepository(env: {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}): FraudDirectoryRepository {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return new LocalFraudDirectoryRepository('local');
  }
  return new ResilientFraudDirectoryRepository(
    new SupabaseFraudDirectoryRepository(url, anonKey, getOrCreateReporterId)
  );
}
