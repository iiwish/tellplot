# T142 Test Results

## RED

| Command | Result |
| --- | --- |
| `pnpm exec vitest run packages/editor/tests/package/stable-release.test.ts -t "uses one closed descriptor"` | Failed as expected: `current-release.json` missing；1 failed / 14 skipped |

## Final GREEN

| Command | Result |
| --- | --- |
| Focused stable/single-package/candidate tools Vitest | Passed: 3 files / 31 tests |
| `pnpm test:package` | Passed: publint、ATTW、ESM/CJS、NodeNext types、pack contract for `tellplot@2.0.0` |
| `pnpm release:audit` | Passed: version 2.0.0、one public package、public surface audit、27 public files、21 markdown files |
| `pnpm release:architecture` | Passed: 62 source files、237 import edges、0 runtime cycles |
| `pnpm lint` | Passed with zero warnings |
| `pnpm format:check` | Passed |
| `git diff --check` | Passed |
| T131 immutable evidence receipt | Passed: 6/6 paths，0 mismatches |
| T142 patch replay | Superseded by A002 receipt below |

## T142-A002 Targeted Recovery

| Command | Result |
| --- | --- |
| Stable release privacy RED | Failed as expected: missing `.vercel`/local environment exclusion；1 failed / 14 skipped |
| Focused stable/single-package/candidate tools Vitest | Passed: 3 files / 31 tests |
| `pnpm test:package` | Passed: publint、ATTW、ESM/CJS、NodeNext types、`tellplot@2.0.0` pack contract |
| `pnpm release:architecture` | Passed: 62 source files、237 import edges、0 runtime cycles |
| `pnpm lint` | Passed with zero warnings |
| Targeted Prettier + `git diff --check` | Passed |
| T142-A002 patch replay | Passed: forward、12-path byte identity、reverse-check |

## T142-A003 Clean Rehearsal Recovery

| Command | Result |
| --- | --- |
| First clean `pnpm release:rehearse` | Failed at `typecheck`: internal `@tellplot/editor` declarations had not been built |
| Stable release gate-order RED | Failed as expected: `build` index followed `typecheck`；1 failed / 14 skipped |
| Focused stable/single-package/candidate tools Vitest | Passed: 3 files / 31 tests |
| `pnpm test:package` | Passed: publint、ATTW、ESM/CJS、NodeNext types、`tellplot@2.0.0` pack contract |
| `pnpm release:architecture` | Passed: 62 source files、237 import edges、0 runtime cycles |
| `pnpm lint` | Passed with zero warnings |
| Targeted Prettier + `git diff --check` | Passed |
| T142-A003 patch replay | Passed: forward、12-path byte identity、reverse-check |

## Boundary Verification

- `pnpm-lock.yaml` 与 private workspace versions 未修改。
- Public package version保持 `2.0.0`；public API/schema/export map未变化。
- Workflow只有一个 `npm stage publish`，没有 direct `npm publish` 或 token path。
- Live `release:preflight` / trust-readiness 未运行，因为会查询 remote/registry且未获授权；同等失败关闭逻辑由
  hermetic fixtures验证，外部状态不报告为 pass。
- Isolated source rehearsal 不复制 `.env`、`.env.local`、`.env.*.local` 或 `.vercel`；该边界由
  current/candidate 两条 rehearsal 的 contract assertions 共同固定。
