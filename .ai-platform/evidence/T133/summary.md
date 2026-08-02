# T133 Evidence Summary

## Metadata

- Task: `T133`
- Goal: `G008`
- Status: `Needs_Review`
- Completed: 2026-08-02
- Vercel project: `iiwishs-projects/tellplot`
- Project ID: `prj_qKFf9bxnrwIHOszna7Llf2GeuRoj`

## Result

GitHub repository `iiwish/tellplot` is connected to Vercel. The project builds from the repository root with Node 22,
pnpm 11.1.3, a frozen lockfile and `pnpm build:site`; deployment output is `apps/playground/dist`.

The accepted Preview is `https://tellplot-ftdctedo6-iiwishs-projects.vercel.app`
(`dpl_4V5qPXy3PvwgY1SWLgDYQh5LQjHj`). It is Ready and uses the same website configuration as production. Preview
Deployment Protection remains enabled; authenticated `vercel curl` checks returned 200 for `/`, `/examples`, `/docs`,
`/playground`, `robots.txt` and `sitemap.xml`, while an unknown path returned 404.

The Git-triggered Production deployment is `https://tellplot-6mhxgsnt9-iiwishs-projects.vercel.app`
(`dpl_FJzDPfSmUEgfeYkMhoYdMPXXeJmC`). Vercel cloned `main` commit
`b4f449ede812452b76a1c0f196543253476b078b` and assigned the production aliases after the build became Ready.

## Build Contract

- Vercel build region: Washington, D.C. (`iad1`), 2 cores and 8 GB.
- Runtime: Node 22.x selected from the repository `engines` contract.
- Package manager: pnpm 11.1.3 invoked explicitly with `--frozen-lockfile`.
- Supply-chain check: 537 lockfile entries passed Vercel's install policy check.
- Output: four route-specific HTML shells and hashed CSS/JavaScript assets.
- Largest JavaScript output: 448.82 kB, below the existing 500 kB build budget.

## Scope

T133 changes only deployment linkage and evidence. It does not change the npm package, public API, chart schema,
editor behavior or G2 runtime ownership.
