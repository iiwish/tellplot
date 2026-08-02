# T133 Test Results

## Preview

| Check | Result |
| --- | --- |
| Deployment state | Ready |
| `/`, `/examples`, `/docs`, `/playground` | 200 |
| `/robots.txt`, `/sitemap.xml` | 200 |
| Unknown direct path | 404 with `X-Robots-Tag: noindex` |
| Route shell title/canonical/OG metadata | Passed |
| HTML cache | `public, max-age=0, must-revalidate` |
| Hashed asset cache | `public, max-age=31536000, immutable` |
| CSP/frame/MIME/referrer/permissions headers | Passed |

## Production Source

| Property | Value |
| --- | --- |
| Deployment | `dpl_FJzDPfSmUEgfeYkMhoYdMPXXeJmC` |
| State | Ready |
| Target | Production |
| Git repository | `github.com/iiwish/tellplot` |
| Git branch | `main` |
| Git commit | `b4f449ede812452b76a1c0f196543253476b078b` |
| Build runtime | Node 22.x / pnpm 11.1.3 |

## Local Gate Reused By Preview

- Focused deployment/metadata/build-output Vitest: 3 files, 13 tests passed.
- Full unit: 56 files, 457 tests passed.
- Relevant Chromium/Firefox/WebKit website E2E: 27/27 passed.
- Metadata showcase E2E in Chromium: 5/5 passed.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build:site`: passed.
- Repository credential-pattern scan: clean.
- Strict artifact validation and `git diff --check`: passed.
