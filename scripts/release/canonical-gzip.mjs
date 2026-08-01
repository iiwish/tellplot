import { readFileSync, writeFileSync } from 'node:fs';

const GZIP_HEADER_LENGTH = 10;
const GZIP_ID1 = 0x1f;
const GZIP_ID2 = 0x8b;
const GZIP_DEFLATE_METHOD = 8;
const GZIP_OS_OFFSET = 9;
const GZIP_UNKNOWN_OS = 255;

export function canonicalizeGzipHeader(path) {
  const artifact = readFileSync(path);
  if (
    artifact.length < GZIP_HEADER_LENGTH ||
    artifact[0] !== GZIP_ID1 ||
    artifact[1] !== GZIP_ID2 ||
    artifact[2] !== GZIP_DEFLATE_METHOD
  ) {
    throw new Error(`Release artifact is not a valid gzip stream: ${path}`);
  }

  artifact[GZIP_OS_OFFSET] = GZIP_UNKNOWN_OS;
  writeFileSync(path, artifact);
}
