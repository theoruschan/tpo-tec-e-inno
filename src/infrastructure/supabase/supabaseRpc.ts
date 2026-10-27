/**
 * Llamada a una función RPC de Supabase (PostgREST) con la clave pública.
 * Se usa fetch directo para no sumar supabase-js al bundle.
 */
export async function callSupabaseRpc<T>(
  projectUrl: string,
  anonKey: string,
  fn: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${projectUrl.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Supabase RPC ${fn} respondió ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
