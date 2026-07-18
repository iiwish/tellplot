# T109 Summary

## Status

Needs review. The independent TellPlot repository, public namespace migration, local regression suite, clean-clone verification and hosted CI are complete. User acceptance is the remaining T109 gate.

## Completed

- Protected the predecessor history in a verified bare mirror.
- Copied the accepted working tree into an independent TellPlot Git root.
- Migrated brand, packages, public DOM/CSS/runtime identifiers, engineering configuration and canonical SSOT.
- Preserved T101-T108 historical evidence unchanged.
- Created the private `iiwish/tellplot` repository with `main` at `6bbce676e68736e78b645eb6a246e7fc64393cd1`.
- Passed frozen install, static quality, 321 tests with coverage, package consumers, React 18/19 runtime consumers, 144 previous-browser tests, 108 current-browser tests, 21 accessibility tests and isolated performance.
- Passed GitHub Actions run `29649240242` and a clean-clone install/build/package verification at the same commit.
- Rechecked the predecessor remote after delivery; its branch heads, private state, archive state and default branch are unchanged.

## Residual Risk

- The first local current-browser matrix had one non-reproducing Chromium focus failure; the exact isolated case, clean local matrix and hosted matrix passed without product or assertion changes.
- GitHub branch protection and rulesets are unavailable for this private repository on the current account plan. GitHub returned HTTP 403; TellPlot remains private and CI status is visible, but `main` cannot yet enforce required checks server-side.
- The hosted Ubuntu software-Canvas profile uses a separately named `650ms` regression budget. The product-profile default remains `150ms`; both profiles retain 200 items, 30 samples, real Canvas and a zero same-target React commit-delta requirement.
- GitHub Actions still uses major action tags; full SHA pinning remains a separately tracked supply-chain hardening item.
- GitHub reports that the current major action versions target deprecated Node 20 while forcing them onto Node 24; upgrading those actions is a follow-up maintenance item.
- Historical patch evidence intentionally preserves original whitespace. `.gitattributes` disables whitespace diagnostics only for `.ai-platform/evidence/**/*.patch`; current source and documentation remain under the normal whitespace gate.
