---
order: 10
---

# 客制开发与贡献

开发章节用于记录 Astro-star 的客制开发方式和贡献约定。修改主题前，先确认需求更适合通过配置、内容还是源码实现。

## 开发前判断

| 目标           | 优先位置                       |
| -------------- | ------------------------------ |
| 修改站点信息   | `src/config/`                  |
| 新增或调整文章 | `src/content/`                 |
| 调整页面结构   | `src/pages/` 和 `src/layouts/` |
| 扩展展示组件   | `src/components/`              |
| 修改视觉样式   | `src/style/`                   |

只有配置和内容无法覆盖需求时，再进入组件、布局和样式层做开发。

## 本地开发流程

```bash
git clone https://github.com/hanlife02/Astro-star.git
cd Astro-star
pnpm install
pnpm dev
```

提交前建议至少运行：

```bash
pnpm check
pnpm build
```

## 贡献原则

- 改动保持聚焦，避免把个人站点内容硬编码进通用组件。
- 新增页面或组件时，同时检查移动端布局和暗色模式。
- 涉及配置、部署或内容格式变化时，同步更新文档。
- 不提交密钥、私钥和真实生产环境凭据。

Astro-star 使用 [Apache License 2.0](https://github.com/hanlife02/Astro-star/blob/main/LICENSE) 开源。
