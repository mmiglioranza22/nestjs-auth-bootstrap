import { resolve } from 'path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'istanbul',
      cleanOnRerun: true,
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['**/*.unit.spec.ts'],
          fileParallelism: true,
          sequence: { concurrent: true, groupOrder: 1 },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['**/*.int.spec.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
          sequence: { concurrent: false, groupOrder: 2 },

          // Can override shared config if needed, e.g., environment: 'node'
        },
      },
    ],
  },
  plugins: [
    // This is required to build the test files with SWC
    swc.vite({
      // Explicitly set the module type to avoid inheriting this value from a `.swcrc` config file
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      // Ensure Vitest correctly resolves TypeScript path aliases
      src: resolve(__dirname, './src'),
      test: resolve(__dirname, './test'),
    },
  },
});
