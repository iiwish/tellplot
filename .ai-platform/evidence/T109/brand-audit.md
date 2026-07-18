# T109 Brand Audit

## RED Baseline

- Lowercase `g2touch`: 176 matches outside patch evidence
- PascalCase `G2Touch`: 8 matches outside patch evidence
- Uppercase `G2TOUCH`: 13 matches outside patch evidence
- CSS/public prefix `gt-`: 434 matches outside patch evidence

The baseline covered package names, imports, DOM attributes, test IDs, CSS classes/variables, environment variables, error names, visible UI text and canonical documentation.

## GREEN Result

- Product brand: `TellPlot`
- Repository/workspace namespace: `tellplot`
- Package scope: `@tellplot`
- DOM scope: `[data-tellplot]`
- CSS namespace: `.tp-` / `--tp-`
- Runtime type prefix: `TellPlot*`
- Environment namespace: `TELLPLOT_*`

Application, package, test, repository and canonical product/feature scans return no legacy namespace matches. No filename contains the legacy project name.

## Intentional Allowlist

Legacy text is allowed only in:

- immutable `.ai-platform/evidence/**` delivery records created before T109;
- the T109 forbidden-remote statements that prevent writes to the predecessor repository.

The common credential signature scan also returned no matches. `gitleaks` is not installed locally, so repository-native pattern scanning and GitHub security facilities provide the available migration checks.
