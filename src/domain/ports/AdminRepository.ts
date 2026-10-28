import { FeedbackOutcome, FeedbackUseful } from './PilotFeedbackRepository';

/** La sesión no existe, venció o el usuario no es administrador. */
export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export interface PendingReport {
  id: string;
  identifierMasked: string | null;
  phoneMasked: string | null;
  city: string;
  reason: string;
  source: string;
  createdAt: string;
  /** Cuántos dispositivos distintos reportaron el mismo identificador (sin contar rechazados). */
  reportsForIdentifier: number;
}

export interface FeedbackRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  verificationId: string;
  verdict: string;
  confidence: number;
  city: string | null;
  propertyType: string | null;
  useful: FeedbackUseful;
  outcome: FeedbackOutcome;
  comment: string | null;
}

export interface AdminStats {
  reportsPending: number;
  reportsApproved: number;
  reportsRejected: number;
  photoSightings: number;
  feedbackTotal: number;
  usefulYes: number;
  usefulPartly: number;
  usefulNo: number;
  outcomeNotPaying: number;
  outcomePaidOk: number;
  outcomePaidScam: number;
  outcomeUndecided: number;
  /** Pagaron, era estafa y el motor había dicho "Verificado": el error más grave. */
  scamMissed: number;
}

/**
 * Puerto del panel de administración. Toda la autorización se valida en el servidor:
 * un usuario que no es admin recibe AdminAuthError aunque llame a las funciones a mano.
 */
export interface AdminRepository {
  signIn(email: string, password: string): Promise<string>;
  signOut(): void;
  currentEmail(): string | null;
  listPendingReports(): Promise<PendingReport[]>;
  moderateReport(id: string, status: 'approved' | 'rejected'): Promise<boolean>;
  listFeedback(limit?: number): Promise<FeedbackRow[]>;
  stats(): Promise<AdminStats>;
}
