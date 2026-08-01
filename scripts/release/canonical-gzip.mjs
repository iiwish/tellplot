import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';

const GZIP_HEADER_LENGTH = 10;
const GZIP_ID1 = 0x1f;
const GZIP_ID2 = 0x8b;
const GZIP_DEFLATE_METHOD = 8;
const GZIP_OS_OFFSET = 9;
const GZIP_UNKNOWN_OS = 255;
const TAR_BLOCK_SIZE = 512;
const TAR_NAME_OFFSET = 0;
const TAR_NAME_LENGTH = 100;
const TAR_SIZE_OFFSET = 124;
const TAR_SIZE_LENGTH = 12;
const TAR_PREFIX_OFFSET = 345;
const TAR_PREFIX_LENGTH = 155;
const PACKAGE_MANIFEST_PATH = 'package/package.json';

function tarString(buffer, offset, length) {
  const end = buffer.indexOf(0, offset);
  const boundedEnd = end === -1 || end > offset + length ? offset + length : end;
  return buffer.toString('utf8', offset, boundedEnd).trim();
}

function sortedJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortedJson);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
        .map(key => [key, sortedJson(value[key])]),
    );
  }
  return value;
}

function canonicalizePackageManifest(archive) {
  for (let offset = 0; offset + TAR_BLOCK_SIZE <= archive.length;) {
    const header = archive.subarray(offset, offset + TAR_BLOCK_SIZE);
    if (header.every(byte => byte === 0)) {
      break;
    }

    const name = tarString(header, TAR_NAME_OFFSET, TAR_NAME_LENGTH);
    const prefix = tarString(header, TAR_PREFIX_OFFSET, TAR_PREFIX_LENGTH);
    const path = prefix.length > 0 ? `${prefix}/${name}` : name;
    const sizeText = tarString(header, TAR_SIZE_OFFSET, TAR_SIZE_LENGTH);
    const size = Number.parseInt(sizeText, 8);
    if (!Number.isFinite(size)) {
      throw new Error(`Release artifact has an invalid tar entry size: ${path}`);
    }

    const contentOffset = offset + TAR_BLOCK_SIZE;
    if (path === PACKAGE_MANIFEST_PATH) {
      const source = archive.toString('utf8', contentOffset, contentOffset + size);
      const trailingNewline = source.endsWith('\n') ? '\n' : '';
      const canonical = Buffer.from(
        `${JSON.stringify(sortedJson(JSON.parse(source)), null, 2)}${trailingNewline}`,
      );
      if (canonical.length !== size) {
        throw new Error('Canonical package manifest changed the tar entry size');
      }
      canonical.copy(archive, contentOffset);
      return;
    }

    offset = contentOffset + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
  }

  throw new Error(`Release artifact is missing ${PACKAGE_MANIFEST_PATH}`);
}

export function canonicalizeNpmTarball(path) {
  const artifact = readFileSync(path);
  if (
    artifact.length < GZIP_HEADER_LENGTH ||
    artifact[0] !== GZIP_ID1 ||
    artifact[1] !== GZIP_ID2 ||
    artifact[2] !== GZIP_DEFLATE_METHOD
  ) {
    throw new Error(`Release artifact is not a valid gzip stream: ${path}`);
  }

  const archive = gunzipSync(artifact);
  canonicalizePackageManifest(archive);

  // npm's streaming compressor can emit different deflate block boundaries for
  // identical tar bytes. Recompress the complete payload under the pinned Node
  // runtime, then normalize the platform byte as well.
  const canonical = gzipSync(archive, { level: 9, mtime: 0 });
  canonical[GZIP_OS_OFFSET] = GZIP_UNKNOWN_OS;
  writeFileSync(path, canonical);
}
