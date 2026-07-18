# T101 Test Results

## RED

| Command | Exit | Expected signal |
| --- | ---: | --- |
| `pnpm test:unit` | 1 | `ERR_PNPM_NO_PKG_MANIFEST`，workspace 尚未建立 |

## GREEN And Fresh Validation

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | 3 workspace projects，lockfile up to date |
| `pnpm peers check` | 0 | No peer dependency issues found |
| `pnpm format:check` | 0 | All matched files use Prettier code style |
| `pnpm lint` | 0 | ESLint 10，0 warning/error |
| `pnpm typecheck` | 0 | editor 与 playground 均通过 TypeScript 6 strict check |
| `pnpm test:unit` | 0 | 1 test file，1 test passed |
| `pnpm build` | 0 | editor ESM/CJS/d.ts/d.cts 与 playground production build 成功 |
| `pnpm test:package` | 0 | publint all good；ATTW 全矩阵绿色；ESM/CJS/type consumer 成功 |
| `git diff --check` | 0 | 无 whitespace error |
| `python3 .../validate_delivery_artifacts.py --root ... --task-id T101` | 0 | core、feature、task 与 T101 evidence 全部通过 |

## Artifact List

`packages/editor/dist`:

- `index.js`
- `index.js.map`
- `index.cjs`
- `index.cjs.map`
- `index.d.ts`
- `index.d.cts`

`apps/playground/dist`:

- `index.html`
- production JavaScript asset

## Not Run

- Browser E2E、axe、performance：T101 无图表与交互行为，这些检查分别从 T105、T106 开始。
- Coverage：T101 runtime entry 为空；95% scoped thresholds 已为 T102 domain 与 T104 waterfall 配置。
