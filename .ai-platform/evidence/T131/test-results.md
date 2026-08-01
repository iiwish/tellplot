# T131 Test Results

## Status

- Status: In_Progress
- Runtime: Node 22.20.0 release runtime；开发期 focused tests 可使用 workspace runtime

## Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Single-package RED contract | Passed as expected | 新增测试在实现前 4/4 失败 |
| `tellplot` package build | Passed | ESM、CJS、declarations 与 CSS 生成成功 |
| `tellplot` package contract | Passed | publint、ATTW、ESM/CJS/types/pack contract |
| Architecture audit | Passed | 5 source layers、54 files、201 edges、0 cycle |
| Release surface audit | Passed | public package 仅 `tellplot`；27 public files、20 Markdown files |
| Supply chain | Passed | 14 AntV packages、17 exact artifacts、48 installed manifests；0 production vulnerabilities |
| Unit and coverage | Passed | 55 files、454 tests；statements 88.44%、branches 80.65%、functions 89.40%、lines 88.52% |
| Framework matrix | Passed | imperative no-framework、React 18.3.1、React 19.2.7、Vue 3.5.27 |
| Current browser | Passed | Chromium/Firefox/WebKit 186/186 |
| Accessibility | Passed | 45/45 |
| Performance | Passed | 3/3；waterfall p95 90.3ms、categorical p95 101.2ms，均低于 150ms local budget |
| Previous browser | Passed | previous release 186/186；WebKit 18.4 62/62 |
| Isolated source rehearsal | Passed | 376 source files；frozen install 到单包 framework matrix 全部通过 |
| Reproducible artifact | Passed | `tellplot-1.0.0.tgz` 485325 bytes；SHA-256 `e476d4f631a0583aa1a8126691e85f510f502d671c1943fe80499640e5c7d10e` |
| Public staged artifact | Pending | 远程执行阶段生成 |
