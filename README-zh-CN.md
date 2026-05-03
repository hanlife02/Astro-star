<div align="center">

<img src="figures/Astro-star.png" alt="Astro-star" width="144" />

# Astro-star

一个把博客、笔记、项目展示和朋友网络放在一起的 Astro 社区主题。

[English](./README.md) · 简体中文

[在线示例](https://hanlife02.com) · [贡献指南](./CONTRIBUTING.md) · [提交 Issue](https://github.com/hanlife02/Astro-star/issues) · [许可证](./LICENSE)

![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?style=flat-square&logo=astro&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.30.x-f69220?style=flat-square&logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)

</div>

## 这是什么

Astro-star 最初是一个个人博客，现在希望慢慢变成一个可一起打磨的个人站点主题。你可以把它 Fork 成自己的家页，也可以把遇到的问题、做出的组件、迁移经验和部署方案带回来，让下一个搭站的人少走一点弯路。

它关注的是“个人站点里的社区感”：文章有人读，笔记能被翻到，项目可以被展示，友链和评论能把独立网站重新连起来。

## 你可以在这里做什么

| 你是           | 可以从这里开始                                  |
| -------------- | ----------------------------------------------- |
| 想搭站的人     | Fork 仓库，替换个人配置和内容，部署成自己的博客 |
| 正在改主题的人 | 复用现有布局、路由、内容集合和样式 Token        |
| 想贡献的人     | 修 Bug、补文档、优化移动端、完善组件和部署经验  |
| 想交流的人     | 通过 Issue 提建议、贴截图、讨论设计和使用体验   |

## 功能亮点

| 能力         | 说明                                                          |
| ------------ | ------------------------------------------------------------- |
| Astro SSR    | 使用 `@astrojs/node` standalone 输出，适合部署到自有服务器    |
| 内容集合     | `blog`、`note`、`project` 基于 Astro Content Collections 管理 |
| 固定站点路由 | 首页、关于、博客、笔记、项目、友链六个核心入口                |
| 主题切换     | 支持亮色、暗色、跟随系统，并通过 Cookie 保持首屏一致          |
| MDX 写作     | 支持 MDX、数学公式、KaTeX、图片题注和自定义内容组件           |
| 评论与友链   | Waline 评论接入，友链页支持申请说明和失联链接展示             |
| 搜索与订阅   | Algolia 站内搜索可选，内置 RSS、Sitemap、robots.txt           |
| GitHub 卡片  | 可在内容中展示 GitHub 仓库信息和 Star 数据                    |
| 配置迁移     | 可提取和复原站点配置、内容、头像与文章图片                    |
| 自动部署     | GitHub Actions 构建，rsync + SSH 发布，PM2 管理进程           |

## 快速加入

```bash
git clone https://github.com/hanlife02/Astro-star.git
cd Astro-star

pnpm install
pnpm dev
```

开发服务器默认运行在 <http://localhost:4321>。

如果你要把它变成自己的站点，通常会改这些地方：

| 目标                           | 位置                   |
| ------------------------------ | ---------------------- |
| 站点名称、头像、导航、社交账号 | `src/config/site.ts`   |
| 关于页内容                     | `src/config/about.ts`  |
| 友链页和友链列表               | `src/config/links.ts`  |
| Algolia 搜索公开配置           | `src/config/search.ts` |
| 博客文章                       | `src/content/blog/`    |
| 短笔记                         | `src/content/note/`    |
| 项目展示                       | `src/content/project/` |
| 头像、站点图标、文章图片       | `public/`              |

## 写作方式

博客和笔记使用 `.md` 或 `.mdx`，放进对应内容目录即可。

```md
---
routeSlug: my-first-post
title: 第一篇文章
description: 这篇文章的简短介绍
createdAt: "2026-05-03 20:00:00"
type: Essay
archiveSlug: writing
---

正文内容...
```

项目展示使用 `src/content/project/`，需要更完整的项目信息。

```md
---
routeSlug: my-project
title: 项目名称
description: 项目简介
createdAt: "2026-05-03 20:00:00"
type: Project
archiveSlug: project
projectUrl: https://example.com
docUrl: https://github.com/user/repo/blob/main/README.md
avatar: /images/project-avatar.svg
---

项目详细介绍...
```

## 配置与内容迁移

如果你已经在本地配置好了自己的站点，可以把个人配置和内容打包：

```bash
pnpm run config:extract
```

它会生成或更新：

| 文件                                | 用途                               |
| ----------------------------------- | ---------------------------------- |
| `src/data/user-config.json`         | 结构化站点配置                     |
| `src/data/user-config.example.json` | 可分享的配置模板                   |
| `src/data/user-content.tar.gz`      | 博客、笔记、项目、头像和图片资源包 |

在另一份仓库中复原这些配置：

```bash
pnpm run config:apply
```

这会重写 `src/config/site.ts`、`src/config/about.ts`、`src/config/links.ts`，并按需解压内容资源。不要把密钥、私有链接或不可公开的个人数据放进这些配置文件。

## 项目地图

```text
/
├── public/                 # 静态资源、头像、站点图标、文章图片
├── scripts/                # 配置迁移、索引同步和构建辅助脚本
├── src/
│   ├── components/         # 可复用组件
│   ├── config/             # 站点、关于页、友链和搜索配置
│   ├── content/            # blog / note / project 内容集合
│   ├── layouts/            # 页面布局
│   ├── pages/              # 路由页面和 API
│   ├── scripts/            # 浏览器端交互脚本
│   ├── style/              # 全局样式、组件样式和设计 Token
│   └── utils/              # Markdown、MDX 和通用工具
├── astro.config.mjs
├── ecosystem.config.cjs
└── package.json
```

固定的顶级路由：

| 路径       | 说明 |
| ---------- | ---- |
| `/`        | 首页 |
| `/about`   | 关于 |
| `/blog`    | 博客 |
| `/note`    | 笔记 |
| `/project` | 项目 |
| `/links`   | 友链 |

## 常用命令

```bash
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产产物到 ./dist/
pnpm preview          # 本地预览构建产物
pnpm check            # Astro 类型检查
pnpm format           # Prettier 格式化
pnpm format:check     # 检查格式
pnpm algolia:sync     # 同步 src/content 到 Algolia 索引
pnpm migrate:content  # 迁移旧内容结构
pnpm config:extract   # 提取用户配置和内容
pnpm config:apply     # 应用用户配置和内容
```

## 一起建设

欢迎从小改动开始。一个清晰的 Issue、一张移动端截图、一个可复现的 Bug、一个更顺手的组件，都能让这个主题更像一个可长期维护的社区项目。

| 类型     | 适合提交的内容                             |
| -------- | ------------------------------------------ |
| Bug      | 构建失败、页面错位、路由异常、暗色主题问题 |
| 体验优化 | 移动端布局、可访问性、交互细节、加载状态   |
| 主题能力 | 新组件、内容卡片、归档视图、友链展示方式   |
| 文档     | 搭站教程、部署记录、配置说明、迁移经验     |
| 集成     | 搜索、评论、订阅、统计和更多部署平台       |

提交 PR 前建议运行：

```bash
pnpm check
pnpm format:check
pnpm build
```

核心约定请看 [CONTRIBUTING.md](./CONTRIBUTING.md)。最重要的几条是：组件不硬编码业务内容，样式放在 `src/style/`，移动端优先，密钥不进入源码。

## 部署

项目内置 GitHub Actions 工作流：推送到 `main` 后计算源码 hash，无变更时跳过构建；有变更时安装依赖、执行 `pnpm build`，再通过 rsync + SSH 同步到服务器，并用 PM2 启动 `dist/server/entry.mjs`。

服务器需要准备：

| 工具    | 要求                             |
| ------- | -------------------------------- |
| Node.js | `>= 22`                          |
| pnpm    | 与 `packageManager` 字段保持一致 |
| PM2     | 用于进程管理                     |
| rsync   | 用于文件同步                     |

GitHub Secrets：

| 名称                       | 默认值         | 说明                                         |
| -------------------------- | -------------- | -------------------------------------------- |
| `SSH_PRIVATE_KEY`          | 无             | 部署用 SSH 私钥                              |
| `SSH_HOST`                 | 无             | 服务器 IP 或域名                             |
| `SSH_USER`                 | `ubuntu`       | SSH 用户名                                   |
| `SSH_PORT`                 | `22`           | SSH 端口                                     |
| `DEPLOY_PATH`              | `~/Astro-star` | 服务器目标目录                               |
| `PM2_APP_NAME`             | `Astro-star`   | PM2 应用名称                                 |
| `APP_PORT`                 | `4321`         | Astro 服务监听端口                           |
| `PUBLIC_WALINE_SERVER_URL` | 无             | Waline 评论服务地址                          |
| `ALGOLIA_WRITE_API_KEY`    | 可选           | Algolia 索引写入 Key                         |
| `ALGOLIA_ADMIN_API_KEY`    | 可选           | 同步前清空旧索引；不配置时不会自动删除旧记录 |

本地开发可创建 `.env`：

```env
WALINE_SERVER_URL=https://your-waline-server.com
GITHUB_TOKEN=your_github_token
```

`.env` 已被 Git 忽略。`GITHUB_TOKEN` 只用于提高 GitHub 仓库卡片 API 请求稳定性，不是必填项。

## 许可证

Astro-star 使用 [Apache License 2.0](./LICENSE) 开源。
