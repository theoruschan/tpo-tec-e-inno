import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

interface VercelHeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

// `pnpm preview` sirve los mismos headers globales que producción (CSP incluida),
// así los problemas de CSP aparecen en local y no recién en Vercel.
function productionHeaders(): Record<string, string> {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf-8')) as { headers: VercelHeaderRule[] };
  const global = vercel.headers.find((rule) => rule.source === '/(.*)');
  return Object.fromEntries((global?.headers ?? []).map((h) => [h.key, h.value]));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // URL absoluta para Open Graph/Twitter. Sin valor, las metas quedan relativas.
  process.env.VITE_PUBLIC_SITE_URL = (env.VITE_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

  return {
    plugins: [react(), tailwindcss()],
    preview: {
      headers: productionHeaders(),
    },
  };
});
