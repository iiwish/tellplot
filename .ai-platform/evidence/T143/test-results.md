# T143 Test Results

## TDD And Recovery

| Check | Result |
| --- | --- |
| Bilingual/schema RED | Failed as expected: `README.en.md` absent from reviewed worktree |
| Bilingual/schema GREEN | Passed: both languages link each other, use schema 3.0.0/comparison data, and reject a 2.0 publish claim |
| T142-A002 privacy RED/GREEN | RED 1 failed / 14 skipped；GREEN focused 31/31 and package gates passed |
| First clean rehearsal | Preserved failure: typecheck ran before clean declarations existed |
| T142-A003 order RED/GREEN | RED 1 failed / 14 skipped；GREEN focused 31/31 and package gates passed |

## Final T143 Gates

| Command / Receipt | Result |
| --- | --- |
| Integrated patch forward replay | Passed: 154 paths match source manifest by type/mode/size/SHA-256 |
| Integrated patch reverse replay | Passed: exact observed source baseline restored |
| Shared Git receipt | Passed: HEAD/ref/index/tags unchanged; index remains unstaged |
| `pnpm release:rehearse` under Node 22.20.0 | Passed: 12 isolated gates; sourceFiles 464 after generated T143 manifest/artifact |
| Isolated `pnpm test:unit` | Passed: 72 files / 613 tests |
| Isolated `pnpm test:package` | Passed: publint, ATTW, ESM/CJS, NodeNext types, pack contract |
| Isolated `pnpm test:framework-matrix` | Passed: imperative DOM, React 18, React 19, Vue 3; scalar/v3 comparison parity |
| Isolated artifact refresh + verify | Passed twice: 597,508 bytes, 41 files, exact SHA-256 |
| Shared stored `pnpm release:artifact` | Passed under Node 22.20.0 with exact manifest/hash |
| Descriptor/workflow/manifest strict parity | Passed |
| `pnpm release:audit` | Passed for tellplot@2.0.0 and exact public surfaces |
| README Prettier/semantic assertions | Passed |
| `git diff --check` | Passed |

## Exact Receipts

- Source patch SHA-256: `19fd38c377c45dcc0af6a3df6848bad684d079e1332b2fc296ad307f5805459d`。
- Source manifest SHA-256: `fc167c6800dd5474293fedf293e3448f29aeb0d865ed3e03a179d179a4e1958a`。
- Artifact SHA-256: `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`。
- Workflow definition SHA-256: `d85da954fee1e5696ddfd6bd678f68ead50f2d4d815ecda45ca9e9d2ea53ac63`。
- Current release descriptor SHA-256: `729bf4a1e67d8249d1146ebf5e961f0376f059ff8aa14750127c99c565570182`。

## External Gates

`release:preflight`、trust-readiness、registry availability、GitHub environment/Trusted Publisher 与 remote
freshness 未运行，状态统一为 `Not_Run_Not_Authorized`。
