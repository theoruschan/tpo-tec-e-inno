import { PhotoSighting } from '../../domain/entities/types';
import {
  PhotoSightingRepository,
  PhotoSubmission,
} from '../../domain/ports/PhotoSightingRepository';
import { callSupabaseRpc } from './supabaseRpc';

interface SightingRow {
  distance: number;
  city: string;
  monthly_rent_ars: number;
  seen_at: string;
  same_contact: boolean | null;
}

/** Índice colaborativo de huellas de fotos en Supabase (RPC match_and_register_photo). */
export class SupabasePhotoSightingRepository implements PhotoSightingRepository {
  constructor(
    private readonly projectUrl: string,
    private readonly anonKey: string,
    private readonly getReporterId: () => string,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    private readonly timeoutMs = 6000
  ) {}

  public async matchAndRegister(submission: PhotoSubmission): Promise<PhotoSighting[]> {
    const rows = await callSupabaseRpc<SightingRow[]>(
      this.projectUrl,
      this.anonKey,
      'match_and_register_photo',
      {
        p_dhash: submission.dHash,
        p_city: submission.city,
        p_monthly_rent_ars: Math.round(submission.monthlyRentArs),
        p_identifier: submission.cbuOrAlias,
        p_phone: submission.ownerPhone,
        p_reporter_id: this.getReporterId(),
      },
      this.fetchImpl,
      this.timeoutMs
    );
    return rows.map((row) => ({
      distance: row.distance,
      city: row.city,
      monthlyRentArs: row.monthly_rent_ars,
      seenAt: row.seen_at,
      sameContact: row.same_contact,
    }));
  }
}

/** Sin Supabase (modo local): no hay índice compartido, no hay avistamientos. */
export class NoPhotoSightingRepository implements PhotoSightingRepository {
  public async matchAndRegister(): Promise<PhotoSighting[]> {
    return [];
  }
}

/** Si la red o Supabase fallan, la verificación sigue sin avistamientos. */
export class ResilientPhotoSightingRepository implements PhotoSightingRepository {
  constructor(private readonly primary: PhotoSightingRepository) {}

  public async matchAndRegister(submission: PhotoSubmission): Promise<PhotoSighting[]> {
    try {
      return await this.primary.matchAndRegister(submission);
    } catch {
      return [];
    }
  }
}
