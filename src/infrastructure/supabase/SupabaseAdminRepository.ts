import {
  AdminAuthError,
  AdminRepository,
  AdminStats,
  FeedbackRow,
  PendingReport,
} from '../../domain/ports/AdminRepository';
import { callSupabaseRpc, SupabaseRpcError } from './supabaseRpc';

interface Session {
  accessToken: string;
  email: string;
  /** Epoch en ms. */
  expiresAt: number;
}

interface PendingRow {
  id: string;
  identifier_masked: string | null;
  phone_masked: string | null;
  city: string;
  reason: string;
  source: string;
  created_at: string;
  reports_for_identifier: number | string;
}

interface FeedbackDbRow {
  id: string;
  created_at: string;
  updated_at: string;
  verification_id: string;
  verdict: string;
  confidence: number;
  city: string | null;
  property_type: string | null;
  useful: FeedbackRow['useful'];
  outcome: FeedbackRow['outcome'];
  comment: string | null;
}

/**
 * Panel admin sobre Supabase Auth (email + contraseña) y las funciones admin_*.
 * La sesión vive solo en memoria: recargar la página la cierra. Que un usuario autenticado
 * sea admin lo decide el servidor (private.admins), no este código.
 */
export class SupabaseAdminRepository implements AdminRepository {
  private session: Session | null = null;

  constructor(
    private readonly projectUrl: string,
    private readonly anonKey: string,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    private readonly now: () => number = () => Date.now(),
    private readonly timeoutMs = 8000
  ) {}

  public async signIn(email: string, password: string): Promise<string> {
    const base = this.projectUrl.replace(/\/$/, '');
    const response = await this.fetchImpl(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: this.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (response.status === 400 || response.status === 401 || response.status === 422) {
      throw new AdminAuthError('Email o contraseña incorrectos.');
    }
    if (!response.ok) {
      throw new Error(`No se pudo iniciar sesión (${response.status}).`);
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      user?: { email?: string };
    };
    if (!data.access_token) {
      throw new Error('La respuesta de inicio de sesión no trae un token.');
    }
    this.session = {
      accessToken: data.access_token,
      email: data.user?.email ?? email.trim(),
      expiresAt: this.now() + (data.expires_in ?? 3600) * 1000,
    };
    return this.session.email;
  }

  public signOut(): void {
    this.session = null;
  }

  public currentEmail(): string | null {
    return this.session && this.session.expiresAt > this.now() ? this.session.email : null;
  }

  public async listPendingReports(): Promise<PendingReport[]> {
    const rows = await this.rpc<PendingRow[]>('admin_list_pending_reports', {});
    return rows.map((row) => ({
      id: row.id,
      identifierMasked: row.identifier_masked,
      phoneMasked: row.phone_masked,
      city: row.city,
      reason: row.reason,
      source: row.source,
      createdAt: row.created_at,
      reportsForIdentifier: Number(row.reports_for_identifier),
    }));
  }

  public moderateReport(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
    return this.rpc<boolean>('admin_moderate_report', { p_id: id, p_status: status });
  }

  public async listFeedback(limit = 100): Promise<FeedbackRow[]> {
    const rows = await this.rpc<FeedbackDbRow[]>('admin_list_feedback', { p_limit: limit });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      verificationId: row.verification_id,
      verdict: row.verdict,
      confidence: row.confidence,
      city: row.city,
      propertyType: row.property_type,
      useful: row.useful,
      outcome: row.outcome,
      comment: row.comment,
    }));
  }

  public async stats(): Promise<AdminStats> {
    const s = await this.rpc<Record<string, number>>('admin_stats', {});
    return {
      reportsPending: s.reports_pending,
      reportsApproved: s.reports_approved,
      reportsRejected: s.reports_rejected,
      photoSightings: s.photo_sightings,
      feedbackTotal: s.feedback_total,
      usefulYes: s.useful_yes,
      usefulPartly: s.useful_partly,
      usefulNo: s.useful_no,
      outcomeNotPaying: s.outcome_not_paying,
      outcomePaidOk: s.outcome_paid_ok,
      outcomePaidScam: s.outcome_paid_scam,
      outcomeUndecided: s.outcome_undecided,
      scamMissed: s.scam_missed,
    };
  }

  private async rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
    const session = this.session;
    if (!session || session.expiresAt <= this.now()) {
      this.session = null;
      throw new AdminAuthError('La sesión venció. Iniciá sesión de nuevo.');
    }
    try {
      return await callSupabaseRpc<T>(
        this.projectUrl,
        this.anonKey,
        fn,
        body,
        this.fetchImpl,
        this.timeoutMs,
        session.accessToken
      );
    } catch (error) {
      if (error instanceof SupabaseRpcError && error.status === 401) {
        // JWT vencido o sin permiso de ejecución: en ambos casos hay que volver a entrar.
        this.session = null;
        throw new AdminAuthError('No tenés permisos de administrador o la sesión venció.');
      }
      if (error instanceof SupabaseRpcError && error.status === 403) {
        throw new AdminAuthError('Tu usuario no está autorizado como administrador.');
      }
      throw error;
    }
  }
}
