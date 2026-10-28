import { VerdictType } from '../entities/types';

export type FeedbackUseful = 'yes' | 'partly' | 'no';
/** not_paying: no pagué · paid_ok: pagué y salió bien · paid_scam: pagué y era estafa · undecided: todavía no decidí. */
export type FeedbackOutcome = 'not_paying' | 'paid_ok' | 'paid_scam' | 'undecided';

export interface PilotFeedbackSubmission {
  verificationId: string;
  verdict: VerdictType;
  confidence: number;
  city?: string;
  propertyType?: string;
  useful: FeedbackUseful;
  outcome: FeedbackOutcome;
  /** Texto libre opcional (hasta 500 caracteres, sin datos personales). */
  comment: string;
}

/** Puerto del feedback del piloto: qué opinan los participantes de cada resultado. */
export interface PilotFeedbackRepository {
  /** false cuando no hay dónde guardar el feedback (modo local sin Supabase). */
  readonly enabled: boolean;
  submit(feedback: PilotFeedbackSubmission): Promise<void>;
}
