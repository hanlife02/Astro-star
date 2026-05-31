# Agent Instructions

开发本项目时必须先阅读并遵守 [Branch Workflow](./docs/branch-workflow.md)。

核心规则：

- `main` 是主分支和模板分支；共享实现、组件、样式、脚本、文档、依赖和通用模板能力都先在 `main` 修改。
- `Ethan` 是用户分支；默认只允许修改 `src/config/` 和 `src/content/`。
- 修改任何分支前必须先从远端拉到最新。
- 模板改动按 `main -> Ethan` 方向合并；不要把 Ethan 的真实配置或内容合回 `main`。
- 如需在 `Ethan` 改动非 `src/config/` 或 `src/content/` 文件，先把对应共享改动移到 `main`。
