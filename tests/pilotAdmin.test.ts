import { describe, expect, it, vi } from 'vitest';
import { AdminAuthError } from '../src/domain/ports/AdminRepository';
import { createAdminRepository, createPilotFeedbackRepository } from '../src/infrastructure/createPilotRepositories';
import { SupabaseAdminRepository } from '../src/infrastructure/supabase/SupabaseAdminRepository';
import {
  NoPilotFeedbackRepository,
  SupabasePilotFeedbackRepository,
} from '../src/infrastructure/supabase/SupabasePilotFeedbackRepository';

const URL = 'https://demo.supabase.co';
const ANON = 'anon-key';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const signInOk = () =>
  json({ access_token: 'jwt-del-admin', expires_in: 3600, user: { email: 'admin@ejemplo.com' } });

describe('SupabaseAdminRepository — login', () => {
  it('inicia sesión con email y contraseña contra /auth/v1/token y guarda la sesión', async () => {
    const fetchMock = vi.fn(async () => signInOk());
    const repo = new SupabaseAdminRepository(URL, ANON, fetchMock as unknown as typeof fetch);

    expect(repo.currentEmail()).toBeNull();
    expect(await repo.signIn('  admin@ejemplo.com ', 'secreto')).toBe('admin@ejemplo.com');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://demo.supabase.co/auth/v1/token?grant_type=password');
    expect((init.headers as Record<string, string>).apikey).toBe(ANON);
    expect(JSON.parse(init.body as string)).toEqual({ email: 'admin@ejemplo.com', password: 'secreto' });
    expect(repo.currentEmail()).toBe('admin@ejemplo.com');
  });

  it('credenciales incorrectas → AdminAuthError y sin sesión', async () => {
    const repo = new SupabaseAdminRepository(
      URL,
      ANON,
      (async () => json({ error: 'invalid_grant' }, 400)) as unknown as typeof fetch
    );
    await expect(repo.signIn('a@b.com', 'mal')).rejects.toBeInstanceOf(AdminAuthError);
    expect(repo.currentEmail()).toBeNull();
  });

  it('un error del servidor no se disfraza de contraseña incorrecta', async () => {
    const repo = new SupabaseAdminRepository(
      URL,
      ANON,
      (async () => json({}, 500)) as unknown as typeof fetch
    );
    const error = await repo.signIn('a@b.com', 'x').catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(AdminAuthError);
    expect((error as Error).message).toContain('500');
  });

  it('signOut borra la sesión', async () => {
    const repo = new SupabaseAdminRepository(URL, ANON, (async () => signInOk()) as unknown as typeof fetch);
    await repo.signIn('admin@ejemplo.com', 'x');
    repo.signOut();
    expect(repo.currentEmail()).toBeNull();
  });
});

describe('SupabaseAdminRepository — funciones admin', () => {
  function repoWith(handler: (url: string, init: RequestInit) => Response, clock = () => 0) {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) =>
      url.includes('/auth/v1/token') ? signInOk() : handler(url, init)
    );
    return {
      fetchMock,
      repo: new SupabaseAdminRepository(URL, ANON, fetchMock as unknown as typeof fetch, clock),
    };
  }

  it('sin sesión ni siquiera llama a la red', async () => {
    const { repo, fetchMock } = repoWith(() => json([]));
    await expect(repo.listPendingReports()).rejects.toBeInstanceOf(AdminAuthError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manda el JWT del usuario (no la clave pública) como Authorization y mapea los reportes', async () => {
    const { repo, fetchMock } = repoWith(() =>
      json([
        {
          id: 'r1',
          identifier_masked: 'alq•••.mp',
          phone_masked: '•••• 9918',
          city: 'CABA',
          reason: 'Pide seña y bloquea',
          source: 'Verificación usuario',
          created_at: '2026-10-28T10:00:00Z',
          reports_for_identifier: '2',
        },
      ])
    );
    await repo.signIn('admin@ejemplo.com', 'x');

    const reports = await repo.listPendingReports();

    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe('https://demo.supabase.co/rest/v1/rpc/admin_list_pending_reports');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-del-admin');
    expect((init.headers as Record<string, string>).apikey).toBe(ANON);
    expect(reports[0]).toMatchObject({
      id: 'r1',
      identifierMasked: 'alq•••.mp',
      reportsForIdentifier: 2,
      reason: 'Pide seña y bloquea',
    });
  });

  it('moderar manda id y estado y devuelve si había algo pendiente', async () => {
    const { repo, fetchMock } = repoWith(() => json(true));
    await repo.signIn('admin@ejemplo.com', 'x');
    expect(await repo.moderateReport('r1', 'rejected')).toBe(true);
    const init = (fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(init.body as string)).toEqual({ p_id: 'r1', p_status: 'rejected' });
  });

  it('mapea las estadísticas y el feedback', async () => {
    const { repo } = repoWith((url) =>
      url.endsWith('admin_stats')
        ? json({
            reports_pending: 3, reports_approved: 25, reports_rejected: 1, photo_sightings: 7,
            feedback_total: 10, useful_yes: 6, useful_partly: 3, useful_no: 1,
            outcome_not_paying: 5, outcome_paid_ok: 1, outcome_paid_scam: 1, outcome_undecided: 3,
            scam_missed: 1,
          })
        : json([
            {
              id: 'f1', created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T11:00:00Z',
              verification_id: 'VER-1', verdict: 'Verificado', confidence: 89, city: 'CABA',
              property_type: 'room', useful: 'no', outcome: 'paid_scam', comment: 'Era una estafa',
            },
          ])
    );
    await repo.signIn('admin@ejemplo.com', 'x');
    expect(await repo.stats()).toMatchObject({ reportsPending: 3, feedbackTotal: 10, scamMissed: 1, photoSightings: 7 });
    expect((await repo.listFeedback())[0]).toMatchObject({
      verificationId: 'VER-1', outcome: 'paid_scam', comment: 'Era una estafa', propertyType: 'room',
    });
  });

  it('403 (autenticado pero no admin) → AdminAuthError, y la sesión sigue abierta', async () => {
    const { repo } = repoWith(() => json({ code: '42501' }, 403));
    await repo.signIn('otro@ejemplo.com', 'x');
    await expect(repo.stats()).rejects.toBeInstanceOf(AdminAuthError);
    expect(repo.currentEmail()).not.toBeNull();
  });

  it('401 (JWT vencido) → AdminAuthError y se cierra la sesión', async () => {
    const { repo } = repoWith(() => json({ code: 'PGRST301' }, 401));
    await repo.signIn('admin@ejemplo.com', 'x');
    await expect(repo.stats()).rejects.toBeInstanceOf(AdminAuthError);
    expect(repo.currentEmail()).toBeNull();
  });

  it('la sesión vence por reloj aunque el servidor no haya dicho nada', async () => {
    let now = 0;
    const { repo, fetchMock } = repoWith(() => json([]), () => now);
    await repo.signIn('admin@ejemplo.com', 'x');
    expect(repo.currentEmail()).toBe('admin@ejemplo.com');
    now = 3600 * 1000 + 1;
    expect(repo.currentEmail()).toBeNull();
    await expect(repo.listFeedback()).rejects.toBeInstanceOf(AdminAuthError);
    expect(fetchMock).toHaveBeenCalledTimes(1); // solo el login
  });

  it('un error 500 no se confunde con falta de permisos', async () => {
    const { repo } = repoWith(() => json({}, 500));
    await repo.signIn('admin@ejemplo.com', 'x');
    const error = await repo.stats().catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(AdminAuthError);
  });
});

describe('Feedback del piloto', () => {
  const feedback = {
    verificationId: 'VER-ABC',
    verdict: 'Verificado' as const,
    confidence: 88.6,
    city: 'CABA',
    propertyType: 'studio',
    useful: 'partly' as const,
    outcome: 'undecided' as const,
    comment: '  me gustó el PDF  ',
  };

  it('manda los campos con el id anónimo del dispositivo y limpia el comentario', async () => {
    const fetchMock = vi.fn(async () => json('ok'));
    const repo = new SupabasePilotFeedbackRepository(URL, ANON, () => 'device-9', fetchMock as unknown as typeof fetch);
    await repo.submit(feedback);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://demo.supabase.co/rest/v1/rpc/submit_pilot_feedback');
    expect(JSON.parse(init.body as string)).toEqual({
      p_verification_id: 'VER-ABC',
      p_verdict: 'Verificado',
      p_confidence: 89,
      p_city: 'CABA',
      p_property_type: 'studio',
      p_useful: 'partly',
      p_outcome: 'undecided',
      p_comment: 'me gustó el PDF',
      p_reporter_id: 'device-9',
    });
  });

  it('comentario vacío viaja como null y se recorta a 500 caracteres', async () => {
    const fetchMock = vi.fn(async () => json('ok'));
    const repo = new SupabasePilotFeedbackRepository(URL, ANON, () => 'd', fetchMock as unknown as typeof fetch);
    await repo.submit({ ...feedback, comment: '   ' });
    await repo.submit({ ...feedback, comment: 'x'.repeat(900) });
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string));
    expect(bodies[0].p_comment).toBeNull();
    expect(bodies[1].p_comment).toHaveLength(500);
  });

  it('sin Supabase configurado: feedback deshabilitado y panel admin ausente', async () => {
    const repo = createPilotFeedbackRepository({});
    expect(repo).toBeInstanceOf(NoPilotFeedbackRepository);
    expect(repo.enabled).toBe(false);
    await expect(repo.submit(feedback)).rejects.toThrow();
    expect(createAdminRepository({})).toBeNull();
  });

  it('con Supabase configurado se crean los dos adaptadores', () => {
    const env = { VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON };
    expect(createPilotFeedbackRepository(env).enabled).toBe(true);
    expect(createAdminRepository(env)).toBeInstanceOf(SupabaseAdminRepository);
  });
});
