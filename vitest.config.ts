import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 15_000,
    projects: [
      {
        test: {
          name: 'editor-unit',
          testTimeout: 15_000,
          include: [
            'packages/editor/tests/package/**/*.test.ts',
            'packages/editor/tests/domain/**/*.test.ts',
            'packages/editor/tests/waterfall/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'editor-components',
          testTimeout: 15_000,
          include: [
            'packages/editor/tests/components/**/*.test.{ts,tsx}',
            'packages/editor/tests/export/**/*.test.{ts,tsx}',
          ],
          environment: 'jsdom',
          setupFiles: ['packages/editor/tests/setup.ts'],
          passWithNoTests: true,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      include: ['packages/editor/src/**/*.{ts,tsx}'],
      thresholds: {
        'packages/editor/src/domain/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        'packages/editor/src/waterfall/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
});
