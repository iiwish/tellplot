# T134 Evidence Summary

## Metadata

- Task: `T134`
- Goal: `G008`
- Status: `Needs_Review`
- Completed: 2026-08-02
- Production origin: `https://tellplot.com`

## Result

Cloudflare remains the authoritative DNS provider for `tellplot.com`. The apex and `www` records are DNS-only CNAMEs
to `d28d1d51593fa3d2.vercel-dns-017.com`; Vercel reports both domains as verified and configured correctly.

Vercel assigns `tellplot.com` and `www.tellplot.com` to production deployment
`dpl_FJzDPfSmUEgfeYkMhoYdMPXXeJmC`. `www` has a project-domain 308 redirect to the canonical apex and preserves the
request path. The apex serves a valid Let's Encrypt certificate and all four public routes over HTTPS.

## Production Contract

- `/`, `/examples`, `/docs`, `/playground`: 200.
- `/robots.txt`, `/sitemap.xml`, `/og-image.png`, `/favicon.svg`: public static assets.
- Unknown direct path: 404, not a catch-all success shell.
- Route-specific title, description, canonical, Open Graph and Twitter metadata: present.
- HTML: revalidated; hashed assets: one-year immutable cache.
- CSP, frame, MIME, referrer and permissions response protections: present.
- Chrome production smoke: homepage navigation, real G2 waterfall rendering, value labels and public navigation passed.

## Rollback

The previous Ready production deployment remains addressable as
`dpl_HGnhVheKWXpN6zbZmRTSsG4ACwnx`. Vercel exposes the authenticated rollback command
`vercel rollback <deployment-id-or-url>`; Cloudflare DNS records remain unchanged during a Vercel rollback. If the
hosting project itself becomes unavailable, both DNS records can be restored from the two-record Cloudflare zone.
