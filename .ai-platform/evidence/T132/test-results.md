# T132 Test Results

## Status

- Status: Passed
- Runtime: Node 22.20.0 / pnpm 11.1.3

## Results

| Gate | Result | Evidence |
| --- | --- | --- |
| RED deployment contract | Passed as expected | 3 files failed：missing metadata/config/shells/assets |
| Focused website unit | Passed | 3 files、13 tests |
| Full unit | Passed | 56 files、457 tests |
| Format | Passed | Prettier full repository |
| Lint | Passed | ESLint 0 warning |
| Typecheck | Passed | 6 workspace projects |
| Production site build | Passed | 4 route shells、7 JS/CSS chunks、4 discovery assets |
| Cross-browser site/editor | Passed | Chromium/Firefox/WebKit 27/27 |
| Metadata client navigation | Passed | Chromium showcase 5/5，含 docs canonical/OG |
| Delivery artifact validator | Passed | strict 0 error / 0 warning |
| Diff integrity | Passed | `git diff --check` |

最大 minified JS chunk 为 448.82 kB，继续低于现有 500 kB build gate。生产输出约 1.9 MB，其中真实社交预览
约 71 kB；没有新增 npm dependency 或 lockfile drift。
