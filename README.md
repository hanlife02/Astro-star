# Astro-star

基于 Astro SSR (`@astrojs/node` standalone) 的个人博客。

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

| 路径 | 说明 |
|------|------|
| `/` | 主页 |
| `/about` | 关于 |
| `/blog` | 博客 |
| `/note` | 笔记 |
| `/project` | 项目 |
| `/links` | 友链 |

## 命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 localhost:4321
pnpm build            # 构建生产产物到 ./dist/
pnpm preview          # 本地预览构建产物
pnpm check            # Astro 类型检查
pnpm format           # Prettier 格式化
```

## 部署

项目通过 GitHub Actions 自动部署。推送到 `main` 分支时自动触发构建并通过 rsync + SSH 部署到云主机，使用 PM2 管理进程。

通过源码 hash 对比避免无变更时的重复构建。

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

| 类型 | 名称 | 默认值 | 说明 |
|------|------|--------|------|
| Secret | `SSH_PRIVATE_KEY` | — | SSH 私钥 |
| Secret | `SSH_HOST` | — | 服务器 IP 或域名 |
| Secret | `SSH_USER` | `ubuntu` | SSH 用户名 |
| Secret | `SSH_PORT` | `22` | SSH 端口 |
| Secret | `APP_PORT` | `4321` | Astro 服务监听端口 |
| Variable | `DEPLOY_PATH` | `~/Astro-star` | 服务器目标目录路径 |
| Variable | `PM2_APP_NAME` | `Astro-star` | PM2 应用名称 |
| Variable | `PUBLIC_WALINE_SERVER_URL` | — | Waline 评论服务地址 |
