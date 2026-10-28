/** Error HTTP de Supabase con el código de estado, para distinguir "no autorizado" de "se cayó". */
export class SupabaseRpcError extends Error {
  constructor(
    public readonly fn: string,
    public readonly status: number
  ) {
    super(`Supabase RPC ${fn} respondió ${status}`);
    this.name = 'SupabaseRpcError';
  }
}

/**
 * Llamada a una función RPC de Supabase (PostgREST).
 * Se usa fetch directo para no sumar supabase-js al bundle.
 * Sin `accessToken` se manda la clave pública (anon); con `accessToken` (panel admin)
 * se manda el JWT del usuario autenticado y la función valida en el servidor quién es.
 */
export async function callSupabaseRpc<T>(
  projectUrl: string,
  anonKey: string,
  fn: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  accessToken?: string
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${projectUrl.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken ?? anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new SupabaseRpcError(fn, response.status);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
