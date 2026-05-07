# SEO 线上验收总结

验收日期：2026-05-07  
验收站点：https://hanlife02.com  
验收方式：使用 Chrome MCP 访问线上页面、抓取 `robots.txt` / `sitemap` / 页面 HTML head / RSS，并对 sitemap 中 URL 做批量抽查。

## 总体结论

本轮 SEO 修复已经正确上线。文章、笔记、项目详情页的核心 SEO 主链路已经打通：搜索引擎可通过 sitemap 发现内容页，详情页具备可控标题、摘要、canonical、社交分享图、发布时间/更新时间和 `BlogPosting` 结构化数据。

当前剩余问题主要集中在非文章页的全站级 SEO 元信息，以及部分页面的标题层级语义。

## 已确认正确

- `https://hanlife02.com/robots.txt` 返回 200。
- `robots.txt` 正确指向 `https://hanlife02.com/sitemap-index.xml`。
- `https://hanlife02.com/sitemap-index.xml` 返回 200，并指向 `https://hanlife02.com/sitemap-0.xml`。
- `sitemap-0.xml` 共包含 87 个 URL。
- sitemap 已包含：
  - 首页、About、Links。
  - Blog / Note / Project 栏目页。
  - Blog / Note 归档页与分类归档页。
  - 71 个内容详情页。
- sitemap 中 87 个 URL 全部返回 200。
- 71 个内容详情页全部具备：
  - `<title>`。
  - `meta[name="description"]`。
  - canonical。
  - `og:image`。
  - `twitter:image`。
  - `article:published_time`。
  - `article:modified_time`。
  - `BlogPosting` JSON-LD。
- RSS 正常：
  - `https://hanlife02.com/rss.xml` 返回 200。
  - RSS 中有 71 个 item。
  - RSS item description 无空项。

## 抽查样例

### 有正文图片文章

URL：`https://hanlife02.com/blog/Shiroi/`

确认结果：

- title：`Shiroi部署的大致流程和补充 - Ethan`
- canonical：`https://hanlife02.com/blog/Shiroi/`
- `og:type`：`article`
- `twitter:card`：`summary_large_image`
- `og:image` / `twitter:image` 使用正文首图：
  - `https://hanlife02.com/figures/006-Shiroi%E9%83%A8%E7%BD%B2%E7%9A%84%E5%A4%A7%E8%87%B4%E6%B5%81%E7%A8%8B%E5%92%8C%E8%A1%A5%E5%85%85.png`
- JSON-LD 类型：`BlogPosting`
- 页面只有一个主 `<h1>`。

### 无正文图片文章

URL：`https://hanlife02.com/note/1/`

确认结果：

- title：`记新征程 - Ethan`
- canonical：`https://hanlife02.com/note/1/`
- `og:image` / `twitter:image` 回退到：
  - `https://hanlife02.com/site-icon.svg`
- JSON-LD 类型：`BlogPosting`
- 页面只有一个主 `<h1>`。

## 发现的问题

### 1. 非文章页缺少全站级 SEO 元信息

以下 16 个非详情页缺 canonical、OG/Twitter 元信息和 JSON-LD：

- `https://hanlife02.com/`
- `https://hanlife02.com/about/`
- `https://hanlife02.com/links/`
- `https://hanlife02.com/blog/`
- `https://hanlife02.com/note/`
- `https://hanlife02.com/project/`
- `https://hanlife02.com/blog-archive/`
- `https://hanlife02.com/blog-archive/building/`
- `https://hanlife02.com/blog-archive/course/`
- `https://hanlife02.com/blog-archive/eihei/`
- `https://hanlife02.com/blog-archive/notes/`
- `https://hanlife02.com/blog-archive/tools/`
- `https://hanlife02.com/note-archive/`
- `https://hanlife02.com/note-archive/follow_heart/`
- `https://hanlife02.com/note-archive/puzzle/`
- `https://hanlife02.com/note-archive/travel/`

影响：这些页面仍可收录，但搜索与社交平台可读取的页面关系、标题摘要与分享信息不完整。

### 2. 详情页缺少 `og:locale`

71 个内容详情页都还没有 `og:locale`。

建议补充：

```html
<meta property="og:locale" content="zh_CN" />
```

如果后续主要写英文内容，可再按站点策略调整为 `en_US` 或做内容级配置。

### 3. 部分页面 `<h1>` 数量不理想

全量抽查发现 14 个页面 `<h1>` 数量不是 1。

典型样例：

- 首页：0 个 `<h1>`。
- `https://hanlife02.com/blog/appointment/`：2 个 `<h1>`。
- `https://hanlife02.com/blog/clab/`：4 个 `<h1>`。
- `https://hanlife02.com/blog/clash/`：7 个 `<h1>`。
- `https://hanlife02.com/project/pku-automatic-appointment/`：2 个 `<h1>`。

影响：这不是最严重的 SEO 问题，但会削弱页面语义结构。建议文章正文内的一级标题统一降级为二级标题，页面自身保留文章标题作为唯一 `<h1>`。

### 4. 默认社交图仍是 SVG 图标

无正文图片文章当前回退到 `site-icon.svg`。

功能上可用，但社交平台更推荐 1200x630 的 PNG/JPG 图片。建议后续制作统一默认 OG 图，例如：

```txt
public/og-default.png
```

并将无图文章的回退图改为该文件。

## 下一步修复顺序

### P1：全站 SEO 元信息收尾

目标：让非文章页也具备稳定的搜索与社交分享信息。

建议改动：

- 在布局层统一支持 canonical。
- 为首页、About、Links、栏目页、归档页补 OG/Twitter 标签。
- 增加全站 `WebSite` JSON-LD。
- 增加站长 `Person` JSON-LD。
- 所有页面补 `og:locale`。

验收标准：

- sitemap 中所有 87 个 URL 都有 canonical。
- 非文章页也有 `og:title`、`og:description`、`og:url`。
- 首页至少有 `WebSite` 和 `Person` JSON-LD。

### P2：标题层级治理

目标：每个页面保留一个主 `<h1>`。

建议改动：

- 首页增加一个语义明确的 `<h1>`。
- 对文章正文中的一级标题做渲染层降级，或批量迁移内容，把正文内 `#` 改为 `##`。
- 项目页检查重复标题来源，避免页面标题和正文标题重复输出为两个 `<h1>`。

验收标准：

- sitemap 中主要页面 `<h1>` 数量为 1。
- 正文层级从 `<h2>` 开始组织。

### P3：默认 OG 图增强

目标：提升无图文章和非文章页的社交卡片展示质量。

建议改动：

- 新增 1200x630 默认 OG 图。
- 将站点默认分享图从 `site-icon.svg` 改为默认 OG 图。
- 重点文章逐步补 frontmatter `image`。

验收标准：

- 无图文章 `og:image` 输出 PNG/JPG 默认图。
- Twitter / Open Graph 卡片预览不再只显示站点图标。

## 当前状态判断

当前线上 SEO 已经从“基础可索引但信号不完整”提升到“内容详情页可稳定发现、标题摘要可控、社交分享与结构化数据完整”。

下一轮最值得做的是全站 SEO 元信息收尾，而不是继续优先处理文章详情页。
