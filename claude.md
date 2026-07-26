# Agent Instructions

开发本项目时必须遵守分支工作流。项目长期文档维护在本地 Obsidian，不在仓库内新增文档目录。

核心规则：

- `main` 是主分支和模板分支；共享实现、组件、样式、脚本、文档、依赖和通用模板能力都先在 `main` 修改。
- `Ethan` 是用户分支；默认只允许修改 `src/config/` 和 `src/content/`。
- 修改任何分支前必须先从远端拉到最新。
- 模板改动按 `main -> Ethan` 方向合并；不要把 Ethan 的真实配置或内容合回 `main`。
- 如需在 `Ethan` 改动非 `src/config/` 或 `src/content/` 文件，先把对应共享改动移到 `main`。

正文图片规则：

- 原图放文章所在分类目录下的 `images/` 子目录，正文用相对路径引用 `./images/xxx.png`。
- 构建时由 Astro 自动转 webp 并注入宽高，`dist/` 里只有压缩产物；`sharp` 是必需依赖，删掉会让带图构建直接失败。
- 不要把正文配图放进 `public/`，那里的文件原样直出、不经压缩。`public/figures/` 只留 `src/config/` 引用的友链头像。
- 图片文件名避免空格和括号；中文可用。原图超过 2MB 时 `pnpm audit:assets` 会列出来提醒。
