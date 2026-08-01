import { defineConfig } from 'tsup';

const internalPackages = ['@tellplot/core', '@tellplot/editor', '@tellplot/react', '@tellplot/vue'];

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core.ts',
    react: 'src/react.ts',
    vue: 'src/vue.ts',
    styles: 'src/styles.css',
  },
  format: ['esm', 'cjs'],
  dts: {
    entry: {
      index: 'src/index.ts',
      core: 'src/core.ts',
      react: 'src/react.ts',
      vue: 'src/vue.ts',
    },
    resolve: internalPackages,
  },
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  minify: false,
  platform: 'browser',
  target: 'es2022',
  external: ['@antv/g2', '@antv/g-svg', 'react', 'react/jsx-runtime', 'vue'],
  noExternal: internalPackages,
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
