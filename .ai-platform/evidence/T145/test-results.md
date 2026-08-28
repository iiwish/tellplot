# T145 Test Results

## Cross-Artifact Integrity

| Check | Result |
| --- | --- |
| T142-T145 required evidence inventory | Passed |
| Feature/task/packet status consistency | Passed |
| T143 artifact size / SHA-256 / file count | Passed: 597,508 / exact SHA / 41 |
| Descriptor / manifest / workflow parity | Passed |
| T143 source manifest and cumulative patch hashes | Passed |
| T144 quality matrix and preflight fixture schema | Passed |
| T144 evidence patch forward/reverse replay | Passed |
| T145 dossier evidence patch forward/reverse replay | Passed |
| T143 frozen patch forward replay receipt | Passed |
| Three-lens findings | Passed: Critical 0 / High 0 / Medium 0 / Low 0 unresolved |
| Evidence privacy / secret / absolute-temp-path scan | Passed |
| Delivery artifact validator | Passed |
| Prettier and `git diff --check` | Passed |
| User-acceptance comparison browser replay | Passed: Chromium/Firefox/WebKit 111/111 |
| User-acceptance comparison a11y replay | Passed: Chromium/Firefox/WebKit 3/3 |

## Exact Receipts

- Artifact: `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`。
- Source manifest: `fc167c6800dd5474293fedf293e3448f29aeb0d865ed3e03a179d179a4e1958a`。
- Source patch: `19fd38c377c45dcc0af6a3df6848bad684d079e1332b2fc296ad307f5805459d`。
- Descriptor: `729bf4a1e67d8249d1146ebf5e961f0376f059ff8aa14750127c99c565570182`。
- Workflow: `d85da954fee1e5696ddfd6bd678f68ead50f2d4d815ecda45ca9e9d2ea53ac63`。
- T144 evidence patch: `9413bb751b080292e19f6dd615b30d93b4729b10800ac39b0b98c94ab2bda5b3`。
- T145 dossier patch: `2c14b7b834b78acfe295442eda355642e2b63cd0922b52a84ff318ffb2ffa4a4`。

## Authorization Boundary

- Git handoff: `Not_Run_Not_Authorized`。
- Remote freshness: `Not_Run_Not_Authorized`。
- Registry availability: `Not_Run_Not_Authorized`。
- Trusted Publisher / GitHub environment: `Not_Run_Not_Authorized`。
- Annotated tag / workflow dispatch / npm stage / npm publish / GitHub Release: `Not_Run_Not_Authorized`。

No external status is inferred from hermetic fixtures or local green gates.
