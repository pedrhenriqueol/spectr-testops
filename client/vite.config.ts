import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const configured = env.SPECTR_API_URL || env.VITE_API_URL;
  const upstream = (configured && !configured.startsWith('/') ? configured : 'http://127.0.0.1:3335').replace(/\/+$/, '');
  const target = upstream.endsWith('/api/v1') ? upstream : upstream.endsWith('/api') ? `${upstream}/v1` : `${upstream}/api/v1`;
  const proxy = { '/api/v1': { target, changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api\/v1(?=\/|\?|$)/, '') || '/' } };
  return {
    plugins: [react()],
    optimizeDeps: { include: ['react-dom'] },
    server: { port: 5173, proxy },
    preview: { proxy }
  };
});
