# Astro-star Docs

这是 Astro-star 项目的 VitePress 文档站。左侧导航按“主题 / 部署 / 创作 / 开发”四部分组织，右侧目录显示当前页面内的标题层级。

## 本地开发

```bash
pnpm install --ignore-workspace
pnpm docs:dev
```

常用命令：

```bash
pnpm docs:dev      # 启动文档开发服务器
pnpm docs:build    # 构建静态文档
pnpm docs:preview  # 预览构建产物
pnpm lint          # 检查 Markdown/配置格式
pnpm lint:fix      # 自动格式化
```

## 内容结构

- `index.md`：文档首页。
- `theme/`：主题章节，目录下的 `.md` 文件会自动进入左侧“主题”导航。
- `deploy/`：部署章节，目录下的 `.md` 文件会自动进入左侧“部署”导航。
- `creation/`：创作章节，目录下的 `.md` 文件会自动进入左侧“创作”导航。
- `develop/`：开发章节，目录下的 `.md` 文件会自动进入左侧“开发”导航。
- `public/astro-star.png`：站点 logo 和 favicon，来自 `Astro-star/figures/Astro-star.png`。
- `public/figures/`：页面预览图，来自 `Astro-star/figures/`。

`README.md` 和 `CONTRIBUTING.md` 通过 `.vitepress/config.mts` 的 `srcExclude` 排除，不会生成站点页面。

新增文档页面时，把 `.md` 文件放进对应目录即可。左侧导航标题默认读取页面第一个 `# 标题`，排序优先读取 frontmatter 中的 `order`：

```md
---
order: 50
---

# 新页面标题
```

## 来源与版权

本仓库的文档站脚手架改造自 [lcpu-club/getting-started](https://github.com/lcpu-club/getting-started)。原仓库采用 MIT License：

```text
Copyright (c) 2024 Linux Club of Peking University
```

本仓库保留原 MIT 版权声明和许可文本，见 [LICENSE](./LICENSE)。Astro-star 项目源码本身采用 Apache-2.0，见 [hanlife02/Astro-star](https://github.com/hanlife02/Astro-star)。
