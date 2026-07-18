# T109 Test Results

## Static And Package

- `pnpm install --frozen-lockfile`: pass; 529-entry lockfile policy check passed
- `pnpm format:check`: pass
- `pnpm lint`: pass
- `pnpm typecheck`: pass for editor and playground
- `pnpm test:coverage`: 30 files, 314/314 tests; 90.56% statements, 84.41% branches, 93.55% functions, 90.65% lines
- `pnpm build`: pass for `@tellplot/editor` and playground
- `pnpm test:package`: publint, Are The Types Wrong, ESM, CJS and type consumer all pass
- `pnpm test:react-matrix`: React 18.3.1 and 19.2.7 each paint 88,744 pixels and unmount cleanly from the packed `@tellplot/editor` tarball

## Browser

- `pnpm test:browser-previous` under Node 22.20.0: Playwright 1.60.0 matrix 108/108 and WebKit 18.4 previous-major matrix 36/36; total 144/144
- First current-browser run: 107/108 passed; one Chromium focus assertion did not retain programmatic focus while the same scenario passed in Firefox, WebKit and previous-browser matrices
- Isolated Chromium rerun of that exact scenario: 1/1 passed without code or assertion changes
- Clean full current-browser rerun: Chromium, Firefox and WebKit 108/108 passed
- `pnpm test:a11y`: 21/21 passed with no serious or critical axe violations
- `pnpm test:performance`: 1/1 passed; 200-item visible-canvas p95 `67.79999995231628ms`, 30 samples, same-target React commit delta 0

## Governance

- Artifact validator: 0 errors, 0 warnings after completing the T109 task and packet fields
- Brand and filename audits: pass with the documented historical/forbidden-remote allowlist
- Remote CI: pending first push
- Clean clone verification: pending first push
