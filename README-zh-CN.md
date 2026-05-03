<div align="center">

<img src="figures/Astro-star.png" alt="Astro-star" width="128" />

# Astro-star

**一个把博客、笔记、项目展示、评论和友链放在一起的开源 Astro 个人站点主题。**

[![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.30.x-f69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)](./LICENSE)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

[English](./README.md) · 简体中文

<a href="https://hanlife02.com">🌐 在线预览</a> &nbsp;·&nbsp;
<a href="./CONTRIBUTING.md">🤝 贡献指南</a> &nbsp;·&nbsp;
<a href="https://github.com/hanlife02/Astro-star/issues">🐛 提交 Issue</a> &nbsp;·&nbsp;
<a href="https://github.com/hanlife02/Astro-star/discussions">💬 参与讨论</a>

</div>

---

## 目录

- [这是什么](#这是什么)
- [功能亮点](#功能亮点)
- [预览](#预览)
- [项目结构](#项目地图)
- [一起建设](#一起建设)
- [技术栈](#技术栈)
- [许可证](#许可证)

## 这是什么

Astro-star 最初是一个个人博客，现在希望慢慢变成一个可一起打磨的个人站点主题。你可以把它 Fork 成自己的家页，也可以把遇到的问题、做出的组件、迁移经验和部署方案带回来，让下一个搭站的人少走一点弯路。

它关注的是"个人站点里的社区感"：文章有人读，笔记能被翻到，项目可以被展示，友链和评论能把独立网站重新连起来。

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

## 预览

> 🌐 在线预览：**<https://hanlife02.com>**

### 首页（暗色）

![Home Dark](figures/Home.png)

### 首页（亮色）

![Home Light](figures/Home-light.png)

### 博客列表

![Blog](figures/Blog.png)

### 博客分类

![Blog Categories](figures/Blog-Categories.png)

### 文章详情

![Content](figures/Content.png)

### 友链页面

![Links](figures/Links.png)

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

## 技术栈

<div align="center">

[![Astro](https://img.shields.io/badge/Astro-ff5d01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MDX](https://img.shields.io/badge/MDX-fb6200?style=for-the-badge&logo=mdx&logoColor=white)](https://mdxjs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Waline](https://img.shields.io/badge/Waline-24292e?style=for-the-badge&logo=github&logoColor=white)](https://waline.js.org)
[![Algolia](https://img.shields.io/badge/Algolia-5468FF?style=for-the-badge&logo=algolia&logoColor=white)](https://www.algolia.com)

</div>

## Star History

<a href="https://star-history.com/#hanlife02/Astro-star&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=hanlife02/Astro-star&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=hanlife02/Astro-star&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=hanlife02/Astro-star&type=Date" />
 </picture>
</a>

## 许可证

Astro-star 使用 [Apache License 2.0](./LICENSE) 开源。

---

<div align="center">

如果觉得这个项目有帮助，欢迎点个 ⭐ 支持一下！

</div>
