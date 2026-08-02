# T134 Test Results

| Check | Result |
| --- | --- |
| Cloudflare authoritative nameservers | `albert.ns.cloudflare.com`, `karina.ns.cloudflare.com` |
| Apex Vercel verification | configured correctly |
| `www` Vercel verification | configured correctly |
| Apex DNS | flattened to Vercel recommended A values |
| `www` DNS | CNAME to `d28d1d51593fa3d2.vercel-dns-017.com` |
| Cloudflare proxy | disabled for both Vercel records |
| `https://tellplot.com` | 200 |
| `https://www.tellplot.com/docs` | 308 to `https://tellplot.com/docs` |
| `/examples`, `/docs`, `/playground` | 200 on canonical origin |
| Unknown path | 404 |
| TLS certificate subject | `CN=tellplot.com` |
| TLS issuer | Let's Encrypt `YR2` |
| TLS validity observed | 2026-08-02 through 2026-10-31 |
| HTML cache | `public, max-age=0, must-revalidate` |
| Security headers | CSP, HSTS, nosniff, DENY frame, referrer and permissions passed |
| `/docs` canonical | `https://tellplot.com/docs` |
| `/docs` title | `开发者文档 | TellPlot` |
| Production Chrome smoke | homepage and real G2 chart rendered |

Vercel's project-domain API also reports `verified: true` for both domains and
`redirect: tellplot.com`, `redirectStatusCode: 308` for `www.tellplot.com`.
