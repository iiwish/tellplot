import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const workspaceAliases = [
  {
    find: '@tellplot/core',
    replacement: fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
  },
  {
    find: '@tellplot/editor/styles.css',
    replacement: fileURLToPath(new URL('./packages/editor/src/styles/editor.css', import.meta.url)),
  },
  {
    find: '@tellplot/editor',
    replacement: fileURLToPath(new URL('./packages/editor/src/index.ts', import.meta.url)),
  },
  {
    find: '@tellplot/react',
    replacement: fileURLToPath(new URL('./packages/react/src/index.tsx', import.meta.url)),
  },
  {
    find: '@tellplot/vue',
    replacement: fileURLToPath(new URL('./packages/vue/src/index.ts', import.meta.url)),
  },
  {
    find: 'tellplot/styles.css',
    replacement: fileURLToPath(new URL('./packages/tellplot/src/styles.css', import.meta.url)),
  },
  {
    find: 'tellplot/react',
    replacement: fileURLToPath(new URL('./packages/tellplot/src/react.ts', import.meta.url)),
  },
  {
    find: 'tellplot/vue',
    replacement: fileURLToPath(new URL('./packages/tellplot/src/vue.ts', import.meta.url)),
  },
  {
    find: 'tellplot/core',
    replacement: fileURLToPath(new URL('./packages/tellplot/src/core.ts', import.meta.url)),
  },
  {
    find: 'tellplot',
    replacement: fileURLToPath(new URL('./packages/tellplot/src/index.ts', import.meta.url)),
  },
] as const;

export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    testTimeout: 15_000,
    projects: [
      {
        test: {
          name: 'core-unit',
          testTimeout: 15_000,
          include: ['packages/core/tests/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: workspaceAliases,
        },
        test: {
          name: 'editor-unit',
          testTimeout: 15_000,
          include: [
            'packages/editor/tests/package/**/*.test.ts',
            'packages/editor/tests/domain/**/*.test.ts',
            'packages/editor/tests/waterfall/**/*.test.ts',
            'packages/editor/tests/categorical/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: workspaceAliases,
        },
        test: {
          name: 'editor-components',
          testTimeout: 15_000,
          include: [
            'packages/editor/tests/components/**/*.test.{ts,tsx}',
            'packages/editor/tests/export/**/*.test.{ts,tsx}',
            'packages/editor/tests/rendering/**/*.test.{ts,tsx}',
            'packages/editor/tests/runtime/**/*.test.{ts,tsx}',
          ],
          environment: 'jsdom',
          setupFiles: ['packages/editor/tests/setup.ts'],
          passWithNoTests: true,
        },
      },
      {
        resolve: {
          alias: workspaceAliases,
        },
        test: {
          name: 'playground-unit',
          testTimeout: 15_000,
          include: ['apps/playground/tests/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: workspaceAliases,
        },
        test: {
          name: 'framework-adapters',
          testTimeout: 15_000,
          include: ['packages/react/tests/**/*.test.tsx', 'packages/vue/tests/**/*.test.ts'],
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
      include: [
        'packages/core/src/**/*.ts',
        'packages/editor/src/**/*.ts',
        'packages/react/src/**/*.tsx',
        'packages/vue/src/**/*.ts',
      ],
      thresholds: {
        'packages/core/src/domain/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        'packages/core/src/charts/waterfall/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        'packages/core/src/charts/categorical/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        'packages/editor/src/rendering/g2/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
});
