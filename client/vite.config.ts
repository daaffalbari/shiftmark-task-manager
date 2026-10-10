import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = command === 'serve' ? loadEnv(mode, fileURLToPath(new URL('../', import.meta.url)), '') : process.env;
  return {
    plugins: [react()],
    server: { port: Number(env.WEB_PORT ?? 5173), strictPort: true, proxy: { '/api': 'http://localhost:' + (env.PORT ?? 3000) } },
  };
});
