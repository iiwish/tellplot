import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', styles: 'src/styles.css' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  platform: 'browser',
  target: 'es2022',
  external: ['@tellplot/editor', 'vue'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
