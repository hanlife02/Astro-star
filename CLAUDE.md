# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build (output: dist/)
npm run preview    # Preview production build
npm run check      # Astro + TypeScript type checking
npm run format     # Prettier format all files
npm run format:check  # Check formatting without writing
```

## Architecture

Astro 5 静态博客，使用 MDX + Content Collections，纯 CSS（无 Tailwind），移动优先响应式设计。

### 路由结构

6 个核心页面，共享 `BaseLayout.astro` → `HomeLayout.astro` 层级布局：

- `/` — 主页，聚合最新文章、个人简介、GitHub 热力图
- `/about/` — 关于页，渲染 `src/content/about/about.mdx`
- `/blog/` `/note/` `/project/` — 动态路由 `[section].astro`，按目录分类列表
- `/links/` — 友链页，渲染 `src/content/links/links.mdx`
- `/[section]/[slug]/` — 文章详情页，支持 `routeSlug` frontmatter 覆盖 URL
- `/[section]-archive/` — 按年份归档
- `/[section]-archive/[archiveSlug]/` — 按分类归档

### 内容目录

```
src/content/
├── blog/       # 长文（子目录即分类：build, course, try 等）
├── note/       # 短笔记
├── about/      # about.mdx
└── links/      # links.mdx
```

文章 slug 和分类通过文件路径自动派生（`content-slug.ts`），标题从路径或 frontmatter 提取（`content-title.ts`），日期优先取 frontmatter，回退到 git 时间戳（`git-timestamps.ts`）。

### 组件分层

- `src/components/layout/` — Shell 骨架组件（HomeShellFrame, DocumentPageShell, ContentShell, HomeShellBackground）
- `src/components/home/` — 首页专属（Signature, GitHeatmap, CodeTime）
- `src/components/content/` — 文章渲染（ArticleDetailPage, SectionListingPage, TocPanel）
- `src/components/links/` — 友链面板
- `src/components/ui/` — 通用 UI（Icon, FloatingActionButton, AppPanelCard）

### 样式系统

纯 CSS，设计令牌在 `src/style/base/tokens.css`（字体 Biotif、颜色变量、响应式 clamp 间距）。样式按域组织在 `src/style/{layouts,pages,components}/`，组件级作用域，无全局污染。

### 客户端脚本

`src/scripts/` 下的 TypeScript 模块处理交互：主题切换、移动端导航/TOC 抽屉、桌面签名导航、入场动画、响应式断点。

## Key Conventions (from AGENTS.md)

- **内容与展示完全分离**：组件不硬编码业务数据，所有数据通过 `Astro.props` 或 `<slot />` 注入
- **移动优先**：基础样式写移动端，通过 `@media (min-width: ...)` 扩展桌面端
- **小步快跑工作流**：每次修改控制在 1-2 个文件，修改后暂停等待人工 review
- **站点配置集中管理**：`src/config/site.ts`（站点元数据、导航、Profile）、`src/config/links.ts`（友链数据）

## Workflow（严格遵守）

与用户协作时必须按以下流程进行：

1. **Ask** — 用户提出需求，我先充分理解，有疑问主动追问
2. **Plan** — 我制定方案（定位问题 → 提出修改计划），每次修改控制在 1-2 个文件
3. **Select** — 用户选择/调整方案
4. **Clarify** — 用户问清计划细节，我回答
5. **Execute** — 我执行修改，输出代码后**立即停止**
6. **Review** — 用户在本地预览并反馈，收到明确批准后才可继续下一步

**禁止一次性大规模修改，禁止未经 review 连续提交多步变更。**

## Tech Stack Notes

- MDX 通过 `@astrojs/mdx` 集成，自定义 `mdx-void-html.js` Vite 插件处理 void HTML 元素
- 数学公式：remark-math + rehype-katex
- 图标：lucide-static
- 外部数据加载器：astro-loader-bluesky-posts、astro-loader-github-prs
