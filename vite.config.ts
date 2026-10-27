import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // URL absoluta para Open Graph/Twitter. Sin valor, las metas quedan relativas.
  process.env.VITE_PUBLIC_SITE_URL = (env.VITE_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

  return {
    plugins: [react(), tailwindcss()],
  };
});
