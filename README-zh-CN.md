<div align="center">

<img src="figures/Astro-star.png" alt="Astro-star" width="128" />

# Astro-star

**一个把博客、笔记、项目展示、评论和友链放在一起的开源 Astro 个人网站主题。**

[![Astro](https://img.shields.io/badge/Astro-6.x-ff5d01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.30.x-f69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)](./LICENSE)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

[English](./README.md) · 简体中文

<a href="./CONTRIBUTING.md">🤝 贡献指南</a> &nbsp;·&nbsp;
<a href="https://github.com/hanlife02/Astro-star/issues">🐛 提交 Issue</a> &nbsp;·&nbsp;
<a href="https://hanlife02.com/project/astro-star">📖 文档</a>

</div>

---

## 目录

- [Astro-star](#astro-star)
  - [目录](#目录)
  - [项目地图](#项目地图)
  - [介绍与部署](#介绍与部署)
  - [一起建设](#一起建设)
  - [技术栈](#技术栈)
  - [使用本主题的网站列表](#使用本主题的网站列表)
  - [交流讨论](#交流讨论)
  - [许可证](#许可证)

## 项目地图

```text
/
├── public/                 # 静态资源、头像、站点图标、文章图片
├── scripts/                # 配置迁移、索引同步和构建辅助脚本
├── src/
│   ├── components/         # 可复用组件
│   ├── config/             # 站点、友链数据和搜索配置
│   ├── content/            # blog / note / project / page 内容集合
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

## 介绍与部署

参考文章 [Astro-star 介绍与部署](https://hanlife02.com/project/astro-star/)

## 一起建设

欢迎从小改动开始。一个清晰的 Issue、一张移动端截图、一个可复现的 Bug、一个更顺手的组件，都能让这个主题更像一个可长期维护的社区项目。

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
[![Waline](https://img.shields.io/badge/Waline-24292e?style=for-the-badge&logo=github&logoColor=white)](https://waline.js.org)
[![Algolia](https://img.shields.io/badge/Algolia-5468FF?style=for-the-badge&logo=algolia&logoColor=white)](https://www.algolia.com)

</div>

## 使用本主题的网站列表

欢迎使用本主题搭建你的个人站点！提交 PR 将你的站点加入列表。

| 头像                                                      | 网站                           | 介绍                           |
| --------------------------------------------------------- | ------------------------------ | ------------------------------ |
| <img src="https://github.com/hanlife02.png" width="50" /> | [Ethan](https://hanlife02.com) | Don't stay awake for too long. |

## 交流讨论

欢迎在 [LINUX DO](https://linux.do) 社区参与讨论、反馈问题与功能建议。

## 许可证

Astro-star 使用 [Apache License 2.0](./LICENSE) 开源。

<a href="https://www.star-history.com/?repos=hanlife02%2FAstro-star&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=hanlife02/Astro-star&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=hanlife02/Astro-star&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=hanlife02/Astro-star&type=date&legend=top-left" />
 </picture>
</a>

---

<div align="center">

如果觉得这个项目有帮助，欢迎点个 ⭐ 支持一下！

</div>
