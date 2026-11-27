import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { alphaTab } from '@coderline/alphatab-vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
// Les dépendances sont remontées à la racine du monorepo (npm workspaces).
const alphaTabDist = dirname(require.resolve('@coderline/alphatab'));
const pkg = (name: string) => resolve(here, `../../packages/${name}/src/index.ts`);

// https://v2.tauri.app/start/frontend/vite/
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  // Chemins relatifs : le même build sert à Tauri et à l'aperçu en ligne.
  base: './',
  plugins: [react(), alphaTab({ alphaTabSourceDir: alphaTabDist })],
  resolve: {
    alias: {
      '@guitar-lab/core': pkg('core'),
      '@guitar-lab/alphatab-bridge': pkg('alphatab-bridge'),
      '@guitar-lab/features': pkg('features'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'es2022',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 3000,
  },
});
