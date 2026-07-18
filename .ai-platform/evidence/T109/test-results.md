# T109 Test Results

## Static And Package

- `pnpm install --frozen-lockfile`: pass; 529-entry lockfile policy check passed
- `pnpm format:check`: pass
- `pnpm lint`: pass
- `pnpm typecheck`: pass for editor and playground
- `pnpm test:coverage`: 31 files, 321/321 tests; 90.53% statements, 84.36% branches, 93.55% functions, 90.61% lines
- `pnpm build`: pass for `@tellplot/editor` and playground
- `pnpm test:package`: publint, Are The Types Wrong, ESM, CJS and type consumer all pass
- `pnpm test:react-matrix`: React 18.3.1 and 19.2.7 each paint 88,744 pixels and unmount cleanly from the packed `@tellplot/editor` tarball

## Browser

- `pnpm test:browser-previous` under Node 22.20.0: Playwright 1.60.0 matrix 108/108 and WebKit 18.4 previous-major matrix 36/36; total 144/144
- First current-browser run: 107/108 passed; one Chromium focus assertion did not retain programmatic focus while the same scenario passed in Firefox, WebKit and previous-browser matrices
- Isolated Chromium rerun of that exact scenario: 1/1 passed without code or assertion changes
- Clean full current-browser rerun: Chromium, Firefox and WebKit 108/108 passed
- `pnpm test:a11y`: 21/21 passed with no serious or critical axe violations
- Local product-profile `pnpm test:performance`: 1/1 passed; 200-item visible-canvas p95 `79.2ms`, 30 samples, product budget `150ms`, same-target React commit delta 0
- Hosted Linux software-Canvas profile: 1/1 passed; p95 `292.4ms`, 30 samples, hosted-runner budget `650ms`, same-target React commit delta 0. The product budget remains `150ms`; an explicit parser contract prevents invalid or non-positive overrides.

## Governance

- Artifact validator: 0 errors, 0 warnings after completing the T109 task and packet fields
- Brand and filename audits: pass with the documented historical/forbidden-remote allowlist
- GitHub Actions run `29649240242` passed at commit `6bbce676e68736e78b645eb6a246e7fc64393cd1`: Node 22.20 and 24.15 quality jobs, React runtime matrix, performance, 108 current-browser tests and 144 previous-browser tests all passed
- Clean clone verification passed at the same commit: frozen install, build and package-consumer gates all passed from a new temporary clone
- Old remote immutability check passed after the new remote CI: `main` remains `af3aec4f5d2b74453a56cb413777a1dd93b5daf6`; `dev` remains `59739ed6ba5695b8edf54c2989d19105295a1c6c`; the repository remains private, unarchived and defaults to `main`
- GitHub returned HTTP 403 for branch protection and repository rulesets because private-repository rules require GitHub Pro on the current account. The repository remains private; this external limitation is recorded rather than weakening privacy or claiming a protection rule that does not exist.
