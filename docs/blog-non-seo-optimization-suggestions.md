# 博客站点 SEO 之外优化建议

本文档记录当前 Astro 博客站点在 SEO 之外值得优化的方向，重点覆盖性能、读者体验、可访问性、部署架构和维护成本。

## 当前观察

- 项目是 Astro 博客站，已有 RSS、robots、sitemap、站内搜索、Waline 评论、文章目录、归档页和多种背景动效。
- 构建配置当前使用 `output: "server"` 和 `@astrojs/node`，但多数内容页已经显式 `prerender = true`。
- `public/figures` 约 90MB，图片资源是当前体积最大的部分。
- `public/fonts` 约 3.7MB，基础布局会在每页 preload 4 个 TTF 字体。
- KaTeX 样式在全站基础布局中引入，构建产物中 KaTeX 字体约 1.1MB，但数学公式主要集中在少数课程文章。
- `HomeShellScripts.astro` 会统一初始化主题、导航、目录、搜索、评论、GitHub 仓库卡片和图片灯箱等逻辑。

## 实施记录

### 2026-05-10

已落地：

- 站内搜索第三方资源已从 `latest` 改为固定版本，降低上游变更导致的回归风险。
- 页面切换时补充前端交互模块清理，减少 ClientRouter 导航后的重复监听和残留状态。
- GitHub 仓库卡片改为页面存在仓库卡片节点时再拉取数据。
- 新增 `pnpm audit:assets`，用于报告 `public/figures` 中超过 800KB 的图片和未引用图片。
- 新增 `pnpm audit:content`，用于检查 blog、note、project 的关键 frontmatter 和日期格式。
- 补齐当前缺失 `createdAt` 的 5 篇内容，内容审计已经无元数据问题。
- 文章详情页新增上一篇/下一篇入口，降低读者继续阅读成本。
- 文章代码块新增复制按钮，并纳入 ClientRouter 页面切换清理。
- RSS 和 robots 响应补充缓存头。
- 清理 `astro check` 中的 deprecated icon、未使用参数和 inline script 类型提示，当前检查为 0 errors / 0 warnings / 0 hints。

当前仍建议单独处理：

- 图片资源真实压缩、WebP/AVIF 转换和响应式尺寸生成。
- 字体 WOFF2 化及 preload 精简。
- KaTeX CSS 按文章内容条件加载。
- Waline 评论模块按页面条件动态加载。
- 图片灯箱焦点锁定和关闭后焦点恢复。

## 优先级建议

### P0：图片与媒体资源

这是收益最高的一项。当前 `public/figures` 约 90MB，很多文章图片以 jpg、jpeg、png、gif 原图直接发布。

建议：

- 批量将大图转为 WebP 或 AVIF，保留必要原图作为源文件，不直接作为页面主资源。
- 为文章图片生成响应式尺寸，例如 480w、768w、1200w。
- 在 Markdown/MDX 图片渲染链路中统一补齐 `loading="lazy"`、`decoding="async"`、`width`、`height`。
- 对首屏关键图使用 eager，其余图片 lazy。
- GIF 优先替换为 MP4/WebM，或至少压缩并限制尺寸。

验收标准：

- `public/figures` 发布体积明显下降。
- 文章页滚动加载图片时无明显布局跳动。
- Lighthouse 中 LCP、CLS 有可观改善。

### P0：字体加载

当前每页 preload 4 个 TTF 字体，成本偏高。

建议：

- 将 Biotif TTF 转为 WOFF2。
- 只 preload 首屏必要字重，通常 Regular 和 SemiBold 已够用。
- 非首屏字重使用普通 `@font-face` 延迟加载。
- 如果中文内容为主体，确认拉丁字体对整体视觉的收益是否值得其加载成本。

验收标准：

- 首屏字体请求数量下降。
- 字体资源总下载体积下降。
- 页面无明显 FOIT，`font-display: swap` 保留。

### P1：交互脚本按需加载

`HomeShellScripts.astro` 当前统一初始化所有交互模块，虽然方便维护，但对轻页面会带来不必要的 JS 成本。

建议：

- Waline 评论相关模块只在页面存在 `[data-article-waline]`、`.waline-pageview-count` 或 `.waline-comment-count` 时再动态 import。
- GitHub 仓库卡片只在页面存在 `[data-github-repo-card]` 时初始化。
- 图片灯箱只在文章正文存在 `.content-image-figure img` 时创建 DOM 和绑定事件。
- 目录逻辑只在页面存在 TOC 容器时执行。

验收标准：

- 首页、列表页、links/about 等非文章页面减少不必要 JS。
- 评论包不会在无评论区页面被提前拉取。

### P1：KaTeX 按需加载

全站引入 KaTeX CSS 会让非数学文章也承担样式和字体成本。

建议：

- 在构建阶段识别文章是否包含数学公式。
- 仅对含 `$$`、`\[`、`\(`、`\begin` 等公式标记的文章加载 KaTeX CSS。
- 如果实现成本较低，可以在 content metadata 中生成 `hasMath` 字段。

验收标准：

- 普通文章页不加载 KaTeX 字体。
- 数学课程文章公式渲染保持正常。

### P1：部署模式与缓存策略

博客内容多数适合静态化。当前 `output: "server"` 使部署形态更重，也会引入服务端运行成本。

建议：

- 评估切换为静态优先部署。
- 文章页、列表页、归档页、about、links、RSS、robots 尽量静态输出。
- 动态能力只保留必要 API，例如 GitHub 仓库卡片和 Waline 配置。
- 如果仍保留 Node SSR，给静态资源配置长期缓存，给 API 配置短缓存或 no-store。

验收标准：

- 静态页面可以由 CDN 直接服务。
- API 缓存策略明确，避免重复请求上游。
- 部署产物和运行时复杂度下降。

### P1：第三方资源稳定性

站内搜索目前从 `unpkg.com/@algolia/sitesearch@latest` 加载资源。`latest` 方便但不可控。

建议：

- 锁定 Algolia SiteSearch 版本，避免上游更新破坏样式或行为。
- 或将搜索依赖纳入项目构建，由 Vite 打包。
- 对第三方域名加 `preconnect`。
- 评估 CSP、SRI、referrer policy 等安全策略。

验收标准：

- 搜索行为不会因第三方 latest 变化而突然回归。
- 生产环境第三方请求清晰可控。

### P2：可访问性

当前已有不少 `aria-label`，但交互组件仍可以继续增强。

建议：

- 图片灯箱增加焦点锁定、打开后聚焦关闭按钮、关闭后恢复原触发图片焦点。
- 搜索弹窗确认键盘可完整操作。
- 移动端导航打开后确认 Escape、点击外部、焦点移动体验一致。
- 描边透明标题需要检查对比度，尤其在浅色/深色主题和低亮度屏幕下。
- 跑一次 axe 或 Lighthouse Accessibility。

验收标准：

- 键盘用户可以完成导航、搜索、打开/关闭图片预览和评论操作。
- 自动化可访问性检查无严重问题。

### P2：读者体验

建议：

- 文章页增加上一篇/下一篇。
- 增加相关文章或同分类推荐。
- 代码块增加复制按钮。
- 长文章增加阅读进度。
- 归档页可增加标签、分类或年份筛选。
- 搜索结果主标题建议使用 `headline`，副文本使用 `description` 或 `excerpt`，不要把 URL 放在最主要位置。

验收标准：

- 读者从一篇文章继续阅读相关内容的路径更短。
- 技术文章复制代码更方便。
- 搜索结果可读性提升。

### P2：内容与构建维护

建议：

- 将图片压缩、尺寸生成、未引用资源检查加入脚本。
- 对 `public/figures` 增加资源体积预算，例如单图超过 800KB 给出警告。
- 对文章 frontmatter 做更严格校验，至少统一 `title`、`description`、`createdAt`、`updatedAt`、`image`。
- 定期运行 `pnpm exec astro check`，清理 deprecated icon、未使用 import、inline script 类型提示。

验收标准：

- 大资源不容易无意进入仓库。
- 内容元数据更一致，列表页、RSS、搜索索引更稳定。
- 构建检查保持无 error，warning/hint 数量持续下降。

## 建议执行顺序

1. 图片资源压缩和响应式图片。
2. 字体 WOFF2 化，并减少 preload。
3. Waline、KaTeX、GitHub 卡片、灯箱按需加载。
4. 搜索资源锁版本，调整搜索结果字段。
5. 评估静态优先部署和缓存策略。
6. 补齐可访问性和读者体验细节。
7. 加资源预算和内容元数据校验。

## 近期可落地任务

- 新增脚本扫描 `public/figures` 中超过 800KB 的图片并输出报告。
- 将 `HomeShellScripts.astro` 中的 Waline 顶层 import 改为条件动态 import。
- 将 `BaseLayout.astro` 的字体 preload 缩减为最关键字重。
- 将 `@algolia/sitesearch@latest` 改为固定版本。
- 为图片灯箱补焦点恢复逻辑。
