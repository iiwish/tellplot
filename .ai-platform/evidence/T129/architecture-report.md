# T129 Framework-Neutral Architecture Report

## Result

`PASS`。G006 的框架无关边界由源码、manifest、构建产物、tarball consumer 与浏览器行为矩阵共同证明。

| Metric | Result |
| --- | --- |
| Package source roots | 4 |
| TypeScript / TSX source files | 49 |
| Runtime import edges | 193 |
| Runtime cycles | 0 |
| Public entries | 4 |

## Ownership

- `@tellplot/core`：SourceData、ViewSpec、验证、配置、投影、命令、不变量、历史、交互策略和唯一
  `EditorStore`。
- `@tellplot/editor`：`createEditor`、DOM workbench、G2 screen/export runtime、图表直接操作、大纲、
  Inspector、Toolbar、导出、a11y 与全部资源释放。
- `@tellplot/react`：React host/ref/props/callback/lifecycle 映射。
- `@tellplot/vue`：Vue props/emits/`v-model:view`/expose/lifecycle 映射。

## Enforced Boundaries

- core 不含 DOM、G2、React、React DOM、Vue、dnd-kit 或 lucide 依赖；Node/SSR import 不访问浏览器全局。
- editor 不含 React、React DOM、Vue、dnd-kit 或 lucide；只通过 core 公共入口访问领域状态。
- React/Vue adapters 只调用 `createEditor`/`EditorInstance`，不实现 command、store、投影、G2 runtime 或
  workbench DOM 的第二份副本。
- package matcher 同时覆盖 exact package 与 subpath；源码 import 和 manifest dependency key 使用同一
  policy，`react/jsx-runtime`、G2 subpath、dnd-kit 与 lucide 均有负向测试。
- G2 import 限定在 editor chart spec 与 rendering owner；公共 API 不暴露原始 G2 spec、`Chart` instance
  或 runtime handle。
- 四包提供 ESM、CJS 和声明；editor 拥有完整工作台样式，adapters 只补充无 size containment 的宿主
  sizing contract。

## State And Runtime Integrity

- imperative、React 和 Vue 进入同一个确定性 command/store/runtime；受控候选只有在宿主回传语义一致的
  ViewSpec 后才进入 accepted session。
- snapshot、command candidate 与通知 payload 均为 detached/frozen 数据；hostile prototype、descriptor、
  sparse array 与重复 command/host ID 不可穿透边界。
- preview 与 authoritative render 明确分层；preview render 失败会取消交互并恢复 authoritative scene，
  export 始终读取最新 accepted revision。
- `createEditor` 初始化与 `destroy()` 具有事务式 ownership/disposer 合同；多实例、Strict Mode、异步 render、
  resize 与 late settlement 都有回归测试。

## Supply-Chain Boundary

- AntV 依赖由 14 个 package、17 个精确 artifact 的 version、tarball URL 和 SHA-512 integrity allowlist
  约束，安装前审计 lockfile，安装后再审计 48 个 manifest。
- CI 中 checkout、Node、pnpm 与 artifact upload actions 均固定完整 commit SHA。
- package rehearsal 从 tarball 安装，不读取仓库私有源码或预建 `dist`。

## Conclusion

框架中性是长期源码所有权和可执行合同，不是 build 后剥离 React/Vue 的打包技巧。49/193/0 架构图、
四包公共入口、四宿主等价矩阵和 336-file 隔离源码复演共同满足 FRAMEWORK-SC-001 至 007。
