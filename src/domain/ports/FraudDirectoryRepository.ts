import { FraudDirectoryEntry } from '../entities/types';

export interface FraudReportSubmission {
  cbuOrAlias: string;
  ownerPhone: string;
  ownerName: string;
  listingUrlOrCapture: string;
  city: string;
  reason: string;
}

export interface SubmitReportResult {
  /** 'pending' = entra a moderación; 'saved-locally' = solo en este navegador. */
  status: 'pending' | 'saved-locally';
  message: string;
}

/** Hashes (con sal secreta del servidor) del CBU/alias y teléfono ingresados, para cruzar sin exponerlos. */
export interface InputIdentifierHashes {
  identifier?: string;
  phone?: string;
}

export type DirectorySourceKind = 'shared' | 'local' | 'local-fallback';

/**
 * Puerto del Directorio Colaborativo (Alternativas 6 y 11).
 * Adaptadores: Supabase (compartido entre estudiantes) y localStorage (offline/fallback).
 */
export interface FraudDirectoryRepository {
  readonly kind: DirectorySourceKind;
  /** Entradas que cuentan para el motor (aprobadas o con N reportes independientes). */
  listActiveEntries(): Promise<FraudDirectoryEntry[]>;
  submitReport(report: FraudReportSubmission): Promise<SubmitReportResult>;
  hashIdentifiers(cbuOrAlias: string, phone: string): Promise<InputIdentifierHashes>;
}
