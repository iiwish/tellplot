<p align="center">
  <a href="https://tellplot.com" aria-label="TellPlot website">
    <img src="apps/playground/public/favicon.svg" width="72" height="72" alt="TellPlot logo">
  </a>
</p>

<h1 align="center">TellPlot</h1>

<p align="center">
  <strong>Editable charts for financial narratives, built on AntV G2.</strong>
</p>

<p align="center">
  Reorder, group, annotate, and export waterfall charts and scalar or 2-to-4-series categorical<br>
  bar and column charts without mutating the source data.
</p>

<p align="center">
  <a href="README.en.md">English</a> · <a href="README.md">简体中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/tellplot"><img src="https://img.shields.io/npm/v/tellplot?color=0969da&label=npm" alt="npm version"></a>
  <a href="https://github.com/iiwish/tellplot/actions/workflows/ci.yml"><img src="https://github.com/iiwish/tellplot/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/tellplot"><img src="https://img.shields.io/npm/types/tellplot?color=3178c6" alt="TypeScript types"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/iiwish/tellplot?color=1f883d" alt="MIT license"></a>
</p>

<p align="center">
  <a href="https://tellplot.com">Website</a> ·
  <a href="https://tellplot.com/examples">Examples</a> ·
  <a href="https://tellplot.com/docs">Documentation</a> ·
  <a href="https://tellplot.com/playground">Playground</a>
</p>

<a href="https://tellplot.com/playground">
  <img src="apps/playground/public/og-image.png" alt="TellPlot editor showing an editable waterfall chart">
</a>

## Why TellPlot

Most chart libraries help you draw data. TellPlot also lets users shape the story around it.

- **Edit the narrative, not the source.** Ordering, recursive groups, collapsed states,
  annotations, and emphasis live in a separate `ViewSpec`; host-owned `SourceData` stays
  immutable.
- **Use one editor everywhere.** The same framework-neutral runtime powers imperative DOM,
  React 18/19, and Vue 3 integrations.
- **Compare series without losing editability.** Categorical bar and column charts accept a
  source-ordered dense values matrix with 2 to 4 series and share the scalar narrative commands.
- **Keep every action deterministic.** Direct manipulation, the structure outline, keyboard
  controls, and host commands share one typed command model with undo and redo.
- **Export what users see.** SVG and PNG output preserve the current ordering, grouping, series,
  labels, annotations, and visual semantics.
- **Ship a deliberately small core.** TellPlot makes no runtime network requests and does not
  bundle a dashboard, AI layer, server workflow, or general-purpose plugin system.

## Quick Start

These docs describe the local `tellplot@2.0.0` candidate. Install the verified candidate artifact
in an existing host project:

```bash
pnpm add ./tellplot-2.0.0.tgz
```

After `2.0.0` is published to the registry, hosts can use `pnpm add tellplot@^2.0.0`. This document
does not claim that 2.0 has been published.

Create an editable multi-series column chart in any browser application:

```ts
import { createEditor } from 'tellplot';
import 'tellplot/styles.css';

const host = document.querySelector<HTMLElement>('#chart');
if (!host) throw new Error('Missing chart host');

const editor = createEditor(host, {
  config: {
    type: 'column',
    data: {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: 'actual-versus-budget',
      series: [
        { id: 'actual', label: 'Actual' },
        { id: 'budget', label: 'Budget' },
      ],
      items: [
        {
          id: 'north',
          label: 'North',
          values: [
            { seriesId: 'actual', amount: 128 },
            { seriesId: 'budget', amount: 135 },
          ],
        },
        {
          id: 'south',
          label: 'South',
          values: [
            { seriesId: 'actual', amount: 116 },
            { seriesId: 'budget', amount: 108 },
          ],
        },
      ],
    },
    locale: 'en-US',
  },
});

// Release DOM, G2, and event resources when your host unmounts.
window.addEventListener('pagehide', () => editor.destroy(), { once: true });
```

Use the same `ChartConfig` through the integration that fits your application:

| Environment    | Import path           | Entry point                        |
| -------------- | --------------------- | ---------------------------------- |
| Browser / DOM  | `tellplot`            | `createEditor(container, options)` |
| React 18 or 19 | `tellplot/react`      | `<ChartEditor />`                  |
| Vue 3          | `tellplot/vue`        | `<ChartEditor />`                  |
| DOM-free logic | `tellplot/core`       | validation, commands, persistence  |
| Editor styles  | `tellplot/styles.css` | one shared stylesheet              |

The [integration guide](docs/getting-started.md) includes complete DOM, React, and Vue examples,
controlled and uncontrolled state, image export, and lifecycle rules.

## What You Get

| Capability         | Included                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| Chart families     | Waterfall, scalar categorical, and 2-to-4-series comparison categorical       |
| Narrative editing  | Reorder, recursively group, collapse, expand, pin, annotate, and emphasize    |
| Precision controls | Direct chart manipulation, structure outline, keyboard access, host commands  |
| State              | Immutable source data, versioned `ViewSpec`, deterministic history, undo/redo |
| Presentation       | Titles, semantic colors, axes, labels, tooltips, formats, animation, legends  |
| Output             | SVG, PNG, and serializable `ViewSpec` JSON                                    |
| Quality            | Strict TypeScript, ESM/CJS, accessibility, reduced motion, browser matrices   |

## The Model

TellPlot keeps host data, presentation intent, and user edits intentionally separate:

| Contract      | Owner       | Purpose                                                         |
| ------------- | ----------- | --------------------------------------------------------------- |
| `SourceData`  | Host        | Immutable values, dimensions, stable IDs, series, source refs   |
| `ChartConfig` | Host        | Chart family, appearance, editor capabilities, locale, and size |
| `ViewSpec`    | Host/editor | Ordering, hierarchy, collapse, pinning, annotations, emphasis   |
| Commands      | Shared core | Validated, replayable, undoable transitions between view states |

AntV G2 remains the only rendering and chart-animation engine. TellPlot owns the typed data
contracts, narrative state, interactions, persistence, and export lifecycle; it does not expose a
raw G2 instance or accept arbitrary `G2Spec` overrides.

## Documentation

| Guide                                      | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| [Getting started](docs/getting-started.md) | DOM, React, Vue, controlled state, export         |
| [Public API](docs/api.md)                  | Runtime entry points, types, events, instance API |
| [Data contract](docs/data-contract.md)     | Schema 3.0, scalar and comparison data            |
| [Configuration](docs/configuration.md)     | Safe appearance and editor options                |
| [Error handling](docs/errors.md)           | Validation and recoverable runtime failures       |
| [Architecture](docs/architecture.md)       | Package boundaries and G2 ownership               |
| [Migration](docs/migration.md)             | Breaking data and state migration from 1.x to 2.x |
| [Versioning](docs/versioning.md)           | Compatibility, support, and deprecation policy    |

See the [documentation index](docs/README.md) for product, roadmap, and delivery references.

## Development

TellPlot uses Node 22 and pnpm 11.1.3.

```bash
git clone https://github.com/iiwish/tellplot.git
cd tellplot
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Run the primary quality gates before opening a pull request:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:package
pnpm test:framework-matrix
```

Behavior changes are test-first by default. Financial aggregation, ordering, and hierarchy changes
must include invariant tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full browser,
accessibility, performance, and pull request requirements.

## Community

- Start with the [support guide](SUPPORT.md) for integration questions and minimal reproductions.
- Use the [issue chooser](https://github.com/iiwish/tellplot/issues/new/choose) for reproducible bugs
  and concrete chart requests.
- Report vulnerabilities privately through the
  [security advisory form](https://github.com/iiwish/tellplot/security/advisories/new).
- Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

TellPlot is available under the [MIT License](LICENSE).

This repository currently produces a local `tellplot@2.0.0` candidate. It does not claim an npm,
Git tag, GitHub Release, or Production release. The published `tellplot@1.0.0` lineage remains
separate and immutable.
