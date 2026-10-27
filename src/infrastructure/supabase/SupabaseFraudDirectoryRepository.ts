import { FraudDirectoryEntry } from '../../domain/entities/types';
import {
  FraudDirectoryRepository,
  FraudReportSubmission,
  InputIdentifierHashes,
  SubmitReportResult,
} from '../../domain/ports/FraudDirectoryRepository';

interface PublicDirectoryRow {
  identifier_hash: string | null;
  identifier_masked: string | null;
  phone_hash: string | null;
  phone_masked: string | null;
  city: string;
  reports_count: number;
  last_reported_at: string;
  reason: string;
  source: FraudDirectoryEntry['source'];
  is_approved: boolean;
}

interface HashRow {
  identifier_hash: string | null;
  phone_hash: string | null;
}

/**
 * Adaptador del directorio compartido sobre Supabase (PostgREST RPC).
 * Usa solo la clave pública (anon); la sal del hash y la moderación viven en el servidor.
 * Se habla directo por fetch para no sumar supabase-js al bundle.
 */
export class SupabaseFraudDirectoryRepository implements FraudDirectoryRepository {
  public readonly kind = 'shared' as const;

  constructor(
    private readonly projectUrl: string,
    private readonly anonKey: string,
    private readonly getReporterId: () => string,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    private readonly timeoutMs = 6000
  ) {}

  public async listActiveEntries(): Promise<FraudDirectoryEntry[]> {
    const rows = await this.rpc<PublicDirectoryRow[]>('get_public_fraud_directory', {});
    return rows.map(toDirectoryEntry);
  }

  public async submitReport(report: FraudReportSubmission): Promise<SubmitReportResult> {
    await this.rpc<string>('submit_fraud_report', {
      p_identifier: report.cbuOrAlias,
      p_phone: report.ownerPhone,
      p_city: report.city,
      p_reason: report.reason,
      p_reporter_id: this.getReporterId(),
    });
    return {
      status: 'pending',
      message:
        'Reporte enviado al directorio compartido. Queda pendiente de moderación y empieza a contar cuando se aprueba o cuando 3 estudiantes lo reportan por separado.',
    };
  }

  public async hashIdentifiers(cbuOrAlias: string, phone: string): Promise<InputIdentifierHashes> {
    const rows = await this.rpc<HashRow[]>('hash_identifiers', {
      p_identifier: cbuOrAlias,
      p_phone: phone,
    });
    const row = rows[0];
    return {
      identifier: row?.identifier_hash ?? undefined,
      phone: row?.phone_hash ?? undefined,
    };
  }

  private async rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(
        `${this.projectUrl.replace(/\/$/, '')}/rest/v1/rpc/${fn}`,
        {
          method: 'POST',
          headers: {
            apikey: this.anonKey,
            Authorization: `Bearer ${this.anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );
      if (!response.ok) {
        throw new Error(`Supabase RPC ${fn} respondió ${response.status}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

function toDirectoryEntry(row: PublicDirectoryRow): FraudDirectoryEntry {
  return {
    id: row.identifier_hash ?? `tel-${row.phone_hash}`,
    cbuOrAlias: row.identifier_masked ?? 'Solo teléfono reportado',
    // Vacío a propósito: las entradas compartidas solo matchean por hash.
    normalizedAliasOrCbu: '',
    reportedHolderName: 'Titular no publicado',
    phoneContact: row.phone_masked ?? undefined,
    city: row.city,
    reportsCount: Number(row.reports_count),
    lastReportedAt: row.last_reported_at,
    reason: row.reason,
    source: row.source,
    identifierHash: row.identifier_hash ?? undefined,
    phoneHash: row.phone_hash ?? undefined,
  };
}
