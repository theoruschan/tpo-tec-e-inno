import { AdminRepository } from '../domain/ports/AdminRepository';
import { PilotFeedbackRepository } from '../domain/ports/PilotFeedbackRepository';
import { getOrCreateReporterId } from './createFraudDirectoryRepository';
import { SupabaseAdminRepository } from './supabase/SupabaseAdminRepository';
import {
  NoPilotFeedbackRepository,
  SupabasePilotFeedbackRepository,
} from './supabase/SupabasePilotFeedbackRepository';

interface SupabaseEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

function credentials(env: SupabaseEnv): { url: string; anonKey: string } | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export function createPilotFeedbackRepository(env: SupabaseEnv): PilotFeedbackRepository {
  const c = credentials(env);
  return c
    ? new SupabasePilotFeedbackRepository(c.url, c.anonKey, getOrCreateReporterId)
    : new NoPilotFeedbackRepository();
}

/** null = sin Supabase configurado, no hay panel admin. */
export function createAdminRepository(env: SupabaseEnv): AdminRepository | null {
  const c = credentials(env);
  return c ? new SupabaseAdminRepository(c.url, c.anonKey) : null;
}
