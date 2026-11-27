import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@guitar-lab/core': r('./packages/core/src/index.ts'),
      '@guitar-lab/alphatab-bridge': r('./packages/alphatab-bridge/src/index.ts'),
      '@guitar-lab/features': r('./packages/features/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
  },
});
