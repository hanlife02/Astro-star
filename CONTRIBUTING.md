# 贡献指南

感谢你对 Astro-star 的关注！本文档帮助你快速了解如何参与项目开发。

## 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | >= 22 |
| pnpm | 10.30.x（由 `packageManager` 字段锁定） |
| Git | 最新稳定版 |

## 快速开始

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/<your-username>/Astro-star.git
cd Astro-star

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev
# 访问 http://localhost:4321
```

### 常用命令

```bash
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产产物
pnpm preview          # 本地预览构建产物
pnpm check            # Astro 类型检查
pnpm format           # Prettier 格式化全部文件
pnpm format:check     # 检查格式是否规范（不修改文件）
pnpm config:extract   # 提取用户配置与内容
pnpm config:apply     # 从备份还原配置与内容
```

## 项目架构

```
src/
├── components/       # 可复用组件（纯展示，不含业务数据）
├── config/           # 站点配置（site.ts, about.ts, links.ts）
├── content/          # Content Collections（Markdown/MDX）
│   ├── blog/         # 长篇博客
│   ├── note/         # 短篇笔记
│   └── project/      # 项目展示
├── layouts/          # 页面布局（BaseLayout, HomeLayout）
├── pages/            # 路由页面
├── style/            # 样式文件（按组件/布局/页面分目录）
│   ├── base/         # 设计 Token（CSS 变量）
│   ├── components/   # 组件样式
│   ├── layouts/      # 布局样式
│   └── pages/        # 页面样式
└── utils/            # 工具函数
```

### 固定的 6 条顶级路由

| 路径 | 说明 |
|------|------|
| `/` | 主页 |
| `/about` | 关于 |
| `/blog` | 博客列表 |
| `/note` | 笔记列表 |
| `/project` | 项目列表 |
| `/links` | 友链 |

## 核心开发原则

以下原则是本项目的底线，提交前请逐条自查：

### 1. 内容与展示完全分离

- 组件（`.astro` 文件）**不允许硬编码任何业务内容**。
- 所有数据通过 `Astro.props` 传入或 `<slot />` 注入。
- 业务数据只存在于 `src/content/` 和 `src/config/`。

### 2. 移动优先 (Mobile-First)

- 基础样式面向移动端编写，通过 `@media (min-width: ...)` 扩展桌面端。
- 提交前务必同时检查移动端和桌面端的渲染效果。

### 3. 样式集中管理

- 所有样式放在 `src/style/` 目录下对应的 CSS 文件中。
- 使用 CSS 自定义属性（`src/style/base/tokens.css`）保持设计一致。
- 不使用内联样式，不使用 CSS-in-JS。

### 4. 组件可复用

- 设计组件时考虑在不同主题和框架中的通用性。
- 样式模块化，避免全局污染。

## 样式规范

- 本项目使用**纯 CSS**，不使用 Tailwind 或其他 CSS 框架。
- 颜色、间距、字体等设计 Token 统一在 `src/style/base/tokens.css` 定义。
- 支持亮色 / 暗色主题，通过 `html[data-theme="dark"]` 选择器切换。
- 新增组件时，在 `src/style/components/` 下创建对应的 CSS 文件。

## Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>: <subject>
```

### 常用 type

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（不改变功能） |
| `style` | 样式调整（不影响逻辑） |
| `chore` | 构建、依赖、配置等杂项 |
| `docs` | 文档变更 |
| `ci` | CI/CD 相关 |

### 示例

```
feat: add dark mode toggle to navbar
fix: correct mobile menu z-index overlap
refactor: extract article card into standalone component
```

## 提交 Pull Request

1. 从 `main` 分支创建功能分支：
   ```bash
   git checkout -b feat/your-feature
   ```
2. 完成开发，确保以下检查通过：
   ```bash
   pnpm check            # 类型检查无报错
   pnpm format:check     # 格式规范
   pnpm build            # 构建成功
   ```
3. 推送分支并创建 PR，描述清楚改动内容和动机。
4. 等待 Review，根据反馈迭代。

### PR 检查清单

- [ ] 组件不含硬编码内容
- [ ] 样式在 `src/style/` 目录下
- [ ] 移动端 & 桌面端渲染正常
- [ ] 亮色 & 暗色主题显示正确
- [ ] `pnpm check` 通过
- [ ] `pnpm format:check` 通过
- [ ] `pnpm build` 成功
- [ ] Commit message 符合 Conventional Commits

## 需要帮助？

- 查看 [README.md](./README.md) 了解项目概览
- 提交 [Issue](https://github.com/hanlife02/Astro-star/issues) 反馈问题或建议
