import {
  PilotFeedbackRepository,
  PilotFeedbackSubmission,
} from '../../domain/ports/PilotFeedbackRepository';
import { callSupabaseRpc } from './supabaseRpc';

export class SupabasePilotFeedbackRepository implements PilotFeedbackRepository {
  public readonly enabled = true;

  constructor(
    private readonly projectUrl: string,
    private readonly anonKey: string,
    private readonly getReporterId: () => string,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    private readonly timeoutMs = 6000
  ) {}

  public async submit(feedback: PilotFeedbackSubmission): Promise<void> {
    await callSupabaseRpc<string>(
      this.projectUrl,
      this.anonKey,
      'submit_pilot_feedback',
      {
        p_verification_id: feedback.verificationId,
        p_verdict: feedback.verdict,
        p_confidence: Math.round(feedback.confidence),
        p_city: feedback.city ?? null,
        p_property_type: feedback.propertyType ?? null,
        p_useful: feedback.useful,
        p_outcome: feedback.outcome,
        p_comment: feedback.comment.trim().slice(0, 500) || null,
        p_reporter_id: this.getReporterId(),
      },
      this.fetchImpl,
      this.timeoutMs
    );
  }
}

/** Sin Supabase no hay dónde guardar el feedback: la UI no muestra el formulario. */
export class NoPilotFeedbackRepository implements PilotFeedbackRepository {
  public readonly enabled = false;

  public async submit(): Promise<void> {
    throw new Error('El feedback del piloto no está disponible sin Supabase.');
  }
}
