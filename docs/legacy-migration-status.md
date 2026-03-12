# 旧博客数据迁移状态

最后核对日期：2026-03-13

## 结论

如果只看当前 Astro 站点需要直接展示的核心正文数据，迁移已经接近完成：

- `posts` 已迁移 `17 / 17`
- `notes` 已迁移 `45 / 45`
- `projects` 已迁移 `4 / 4`

如果把旧博客数据库里的所有业务表都算进去，则还有一批“未迁移”数据仍然保留在 `data/mx-space/`，但它们大多属于旧后台系统数据，不是当前前台页面渲染必需项。

## 已完成迁移

### 1. 正文内容

以下正文内容已经迁移到 Astro Content Collections，并且数量和旧库一致：

| 旧库集合 | 旧库数量 | 现站点位置 | 当前数量 | 状态 |
| --- | ---: | --- | ---: | --- |
| `posts` | 17 | `src/content/blog/` | 17 | 已完成 |
| `notes` | 45 | `src/content/note/` | 45 | 已完成 |
| `projects` | 4 | `src/content/project/` | 4 | 已完成 |

这些内容文件都带有 `legacySourceCollection` / `legacySourceId`，可以继续作为后续审计依据。

### 2. 页面级配置

以下页面数据已经迁移出旧博客正文，改为配置驱动：

- `about` 已迁移到 `src/config/about.ts`
- `links` 已迁移到 `src/config/links.ts`

这符合当前项目“内容与展示分离”的目标：页面组件负责布局，业务数据集中在配置或 content collection 中。

## 仍未完成的迁移项

### 1. 旧库分类和专题数据还没有作为一等数据源保留

以下数据目前只是在迁移脚本中被消费，用于生成目录结构或 frontmatter，没有独立迁移成新的 Astro 数据源：

| 旧库集合 | 数量 | 当前状态 |
| --- | ---: | --- |
| `categories` | 6 | 已隐式用于 blog 分类目录，但没有单独的数据文件 |
| `topics` | 3 | 已隐式用于 note 分类目录，但没有单独的数据文件 |

这意味着：

- 当前站点能正常展示分类结果
- 但分类本身不是一个可维护、可复用、可单独查询的数据源

### 2. 旧页面和链接库没有按“原始数据模型”完整迁移

| 旧库集合 | 数量 | 当前状态 |
| --- | ---: | --- |
| `pages` | 3 | 目前没有作为 content collection 独立迁移 |
| `links` | 27 | 当前运行时数据来自 `src/config/links.ts`，不是直接读取旧库 |

补充说明：

- 这不影响 `/about` 和 `/links` 当前页面使用
- 但如果你的目标是“完整保留旧博客数据结构”，这两部分还不算完全迁移

### 3. 旧后台系统数据基本都还未迁移

以下集合目前仍停留在 `data/mx-space/`，没有接入 Astro 站点：

| 旧库集合 | 数量 | 说明 |
| --- | ---: | --- |
| `comments` | 168 | 旧评论数据 |
| `activities` | 2010 | 动态/活动流数据 |
| `recentlies` | 24 | 最近活动类数据 |
| `says` | 25 | 说说/状态类数据 |
| `snippets` | 6 | 片段类数据 |
| `readers` | 1 | 访客/读者相关数据 |

这些数据是否需要迁移，取决于你后续是否要在 Astro 中继续实现对应功能。

## 仍需清理或补齐的尾项

### 1. 仍有旧资源 URL 直接写在正文里

部分 MDX 正文仍然引用旧站远程资源：

- `src/content/blog/eihei/VSCode通过ssh扩展连接CLab云主机.mdx`
- `src/content/blog/eihei/clash配置小白教程(Linux系统).mdx`
- `src/content/blog/tools/Ethan Club 建成公告～.mdx`
- `src/content/blog/notes/numpy和matplotlib的学习笔记.mdx`
- `src/content/note/follow_heart/《小王子》初记.mdx`

这类内容虽然“已迁移正文”，但还没有“完成资源本地化”。

### 2. RSS 还没有迁移到 content collection 查询

当前 `src/pages/rss.xml.ts` 仍在使用 `import.meta.glob()` 聚合内容，不是基于 `getCollection()`。

这说明：

- 功能可以正常工作
- 但数据读取方式还没有完全统一到新的 content collection 架构

### 3. 旧的 about / links 内容文件还在仓库里

以下文件目前更像历史副本，不是当前主要运行时数据源：

- `src/content/about/about.mdx`
- `src/content/links/links.mdx`

如果后续确认不再使用，可以考虑删除或归档，避免数据源重复。

### 4. 个别文本仍有编码质量问题

迁移脚本里仍存在少量旧编码残留迹象，例如 topic 名称覆盖中出现过乱码文本。

这类问题不一定马上影响页面，但属于内容质量尾项，后续最好单独校正。

## 建议按优先级继续迁移

### 高优先级

1. 本地化正文中的旧站资源 URL，避免继续依赖历史对象存储。
2. 把 `rss.xml.ts` 改成基于 content collection 读取，统一数据入口。
3. 清理 `about` / `links` 的重复旧内容文件，减少双份数据源。

### 中优先级

1. 为 `categories` 和 `topics` 建立新的配置文件或 collection，保留分类元数据。
2. 决定 `pages` 和 `links` 是否要保留原始旧库模型，还是只保留当前配置版。

### 低优先级

1. 评估是否要迁移 `comments`、`activities`、`says`、`snippets` 等旧后台数据。
2. 统一修复迁移文本中的编码和命名质量问题。

## 当前可认为“没迁移完”的范围

如果你问的是“博客正文还有多少没迁移”，答案基本是：

- 核心正文内容已经迁移完了
- 剩下主要是资源本地化、分类元数据保留、RSS 数据入口统一、旧后台表是否接入的问题

如果你问的是“旧博客数据库还有多少数据没迁移”，答案是：

- 仍有多张旧业务表完全没有进入 Astro 运行时
- 其中最多的是 `activities` 这类旧后台记录，而不是文章正文
