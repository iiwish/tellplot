# T147 Test Results

## Source Integration

- T143 patch SHA-256：passed。
- `git apply --check` on fresh `origin/main`：passed。
- Patch apply：passed。
- 462-file source manifest parity：passed，0 mismatch / 0 missing / 0 extra。
- `git diff --check`：passed。

## Toolchain And Package

- Node `22.20.0` / pnpm `11.1.3` offline frozen install：passed，459 packages全部从本地 store复用，lockfile未变。
- First `pnpm test:package`：failed as expected before build because clean source had no generated `dist/**`；
  未修改测试、timeout、threshold或断言。
- `pnpm build`：passed，全部 workspace与 playground production build通过。
- Exact replay `pnpm test:package`：passed；publint、ATTW、ESM、CJS、types、pack contract均通过。
- `pnpm release:audit`：passed；version `2.0.0`，public files 27，audited files 627。
- `pnpm release:architecture`：passed；62 source files，237 import edges，runtime cycles 0。
- `pnpm release:artifact`：passed；fresh rebuild仍为 597,508 bytes / 41 files / exact frozen SHA-256。

## Safety

- Artifact/descriptor/workflow exact hash check：passed。
- Shared index unchanged：passed。
- Remote/public forbidden-action audit：passed。
