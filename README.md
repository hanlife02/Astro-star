# Astro-star

基于 Astro SSR (`@astrojs/node` standalone) 的个人博客。

**示例网站：** <https://hanlife02.com>

## 项目结构

```text
/
├── public/              # 静态资源
├── src/
│   ├── content/         # Content Collections (文章、笔记等)
│   ├── components/      # 可复用组件
│   ├── layouts/         # 页面布局
│   ├── pages/           # 路由页面
│   ├── styles/          # 全局与模块样式
│   └── utils/           # 工具函数
├── astro.config.mjs
└── package.json
```

## 页面路由

| 路径       | 说明 |
| ---------- | ---- |
| `/`        | 主页 |
| `/about`   | 关于 |
| `/blog`    | 博客 |
| `/note`    | 笔记 |
| `/project` | 项目 |
| `/links`   | 友链 |

## 快速开始（新用户）

```bash
# 1. fork仓库并clone到本地
git clone https://github.com/[your github username]/Astro-star
cd Astro-star
pnpm install

# 2. 修改自己的信息
# 编辑 src/config 配置，添加 src/content 文章

# 3. 启动开发服务器，在本地预览
pnpm dev
```

## 配置管理

项目通过 `user-config.json` 集中管理所有因人而异的配置，个人数据不进 git。

### 提取配置（打包）

```bash
pnpm run config:extract
```

从当前项目中提取所有用户数据，生成：

- `src/data/user-config.json` — 结构化配置（站点信息、About 页、Links 页、RSS 语言）
- `src/data/user-config.example.json` — 同内容的模板副本（git 追踪，供新用户参考）
- `src/data/user-content.tar.gz` — 内容文件打包（博客/笔记/项目 MDX + 头像 + 友链头像 + 文章图片）

### 应用配置（复原）

```bash
pnpm run config:apply
```

读取打包数据，一键覆盖复原：

- 重新生成 `src/config/site.ts`、`src/config/about.ts`、`src/config/links.ts`
- 修补 `src/pages/rss.xml.ts` 中的 language 字段
- 解压 `user-content.tar.gz` 恢复所有内容文件和图片
- 自动调用 Prettier 格式化

### 配置覆盖范围

| 来源                   | 内容                                                                              |
| ---------------------- | --------------------------------------------------------------------------------- |
| `src/config/site.ts`   | 站点名称、URL、头像、简介、社交账号、备案、监控链接、签名 SVG、代码雨关键词、导航 |
| `src/config/about.ts`  | About 页介绍、社交链接、工具列表、时间线                                          |
| `src/config/links.ts`  | 友链页配置、友链列表、失联链接                                                    |
| `src/config/search.ts` | Algolia 搜索公开配置、索引名、Crawler 验证码                                      |
| `src/pages/rss.xml.ts` | RSS language 字段                                                                 |
| `src/content/`         | 博客文章、笔记、项目介绍（MDX）                                                   |
| `public/`              | 头像 SVG、站点图标、友链头像、文章图片                                            |

## 命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 localhost:4321
pnpm build            # 构建生产产物到 ./dist/
pnpm preview          # 本地预览构建产物
pnpm check            # Astro 类型检查
pnpm format           # Prettier 格式化
pnpm algolia:sync     # 同步 src/content 文章到 Algolia 索引
pnpm config:extract   # 提取用户配置和内容（打包）
pnpm config:apply     # 应用配置和内容（复原）
```

## 部署

项目通过 GitHub Actions 自动部署。推送到 `main` 分支时自动触发构建，并通过 rsync + SSH 部署到云主机，使用 PM2 管理进程。

通过源码 hash 对比避免无变更时的重复构建。

Algolia 搜索是可选功能，不配置也不影响构建和部署。`Application ID`、Search-only API Key、Index Name 和 crawler verification 配置在 `src/config/search.ts` 中；留空时搜索入口和 robots 验证可按配置判断跳过。`Write API Key` / `Admin API Key` 不进入源码，只通过 GitHub Secrets 提供给 workflow。workflow 中的 Algolia 同步步骤为可选步骤，缺少 Secrets 时会跳过，同步失败也不会阻断正常部署。

### 服务器环境要求

```bash
# Node.js (>= 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm

# PM2
npm install -g pm2

# rsync (通常已预装)
sudo apt install -y rsync
```

### GitHub Secrets / Variables

| 类型     | 名称                       | 默认值         | 说明                                                                                              |
| -------- | -------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| Secret   | `SSH_PRIVATE_KEY`          | —              | SSH 私钥                                                                                          |
| Secret   | `SSH_HOST`                 | —              | 服务器 IP 或域名                                                                                  |
| Secret   | `SSH_USER`                 | `ubuntu`       | SSH 用户名                                                                                        |
| Secret   | `SSH_PORT`                 | `22`           | SSH 端口                                                                                          |
| Secret   | `APP_PORT`                 | `4321`         | Astro 服务监听端口                                                                                |
| Secret   | `ALGOLIA_WRITE_API_KEY`    | 可选           | Algolia 索引写入 Key，用于 workflow 同步文章索引                                                  |
| Secret   | `ALGOLIA_ADMIN_API_KEY`    | 可选           | Algolia 管理 Key，用于同步前清空旧索引；不配置时只覆盖已有 objectID，删除文章的旧记录不会自动移除 |
| Variable | `DEPLOY_PATH`              | `~/Astro-star` | 服务器目标目录路径                                                                                |
| Variable | `PM2_APP_NAME`             | `Astro-star`   | PM2 应用名称                                                                                      |
| Variable | `PUBLIC_WALINE_SERVER_URL` | —              | Waline 评论服务地址                                                                               |
