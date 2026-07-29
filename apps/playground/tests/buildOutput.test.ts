import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import { describe, expect, it } from 'vitest';

const playgroundRoot = fileURLToPath(new URL('..', import.meta.url));
const viteWarningThresholdBytes = 500_000;

describe('playground production bundle', () => {
  it('keeps lazy chart and application chunks below the Vite warning threshold', async () => {
    const previousNodeEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    const result = await build({
      root: playgroundRoot,
      logLevel: 'silent',
      build: {
        write: false,
      },
    }).finally(() => {
      if (previousNodeEnv === undefined) {
        delete process.env['NODE_ENV'];
      } else {
        process.env['NODE_ENV'] = previousNodeEnv;
      }
    });
    const outputs = Array.isArray(result) ? result : [result];
    const chunks = outputs.flatMap(output => {
      if (!('output' in output)) {
        throw new Error('Expected a completed playground production build');
      }
      return output.output.filter(item => item.type === 'chunk');
    });
    const chunkSizes = chunks.map(chunk => ({
      fileName: chunk.fileName,
      size: Buffer.byteLength(chunk.code),
    }));

    expect(chunkSizes.length).toBeGreaterThan(1);
    expect(chunkSizes.length).toBeLessThanOrEqual(8);
    expect(chunks.some(chunk => chunk.isEntry && chunk.dynamicImports.length > 0)).toBe(true);
    expect(chunkSizes.every(chunk => chunk.size > 0)).toBe(true);
    expect(Math.max(...chunkSizes.map(chunk => chunk.size))).toBeLessThanOrEqual(
      viteWarningThresholdBytes,
    );
  });
});
