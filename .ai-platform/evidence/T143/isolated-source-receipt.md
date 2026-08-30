# T143 Isolated Source Receipt

## Lineage

- Shared HEAD: `cd90ddf3d27bb323c994b5ba01735a4972c46f48`
- Observed `origin/main`: `4d754cc9d635d097370b674633c972fb0ac199a1`
- Freshness claim: `local_tracking_ref_only`
- Shared index SHA-256: `3f83dab964030f0816078e1ff7312e063fd8920167c0fa3c610d972b7cc69fd8`
- Shared tags digest: `df3da4009d06f9e18edd60c65294ea418fe18644ed37312b60b91388694b8e08`

## Snapshot Rule

Integrated source 由 repository source 组成，排除 `.git`、`.ai-platform/evidence`、`node_modules`、
`dist`、coverage/browser reports、generated video roots、`.copyright-application`、`.env`、
`.env.local`、`.env.*.local`、`.vercel` 和其他明确临时输出。

- Manifest: `source-manifest.json`
- Files: 462
- Manifest SHA-256: `fc167c6800dd5474293fedf293e3448f29aeb0d865ed3e03a179d179a4e1958a`
- Cumulative patch: `diff.patch`
- Patch paths: 154
- Patch size: 1,388,784 bytes
- Patch SHA-256: `19fd38c377c45dcc0af6a3df6848bad684d079e1332b2fc296ad307f5805459d`

## Replay

- Forward `git apply --check`: passed.
- Forward apply + path/type/mode/size/SHA-256 comparison: passed.
- Reverse `git apply -R --check`: passed.
- Reverse apply + observed baseline comparison: passed.
- Shared HEAD/index/tags/ref before/after comparison: passed.

No temporary absolute path, credential value, business dataset value or live external account metadata is recorded in
the manifest or this receipt.
