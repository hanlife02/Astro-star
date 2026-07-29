---
order: 10
---

# 从零开始部署 Astro-star

手把手，小白也可以部署！

## 需要什么

- 一台服务器
- 一个备案的域名
- 一个 github 账号

## 环境准备

- Node.js `>= 22`
- pnpm `10.30.x`
- PM2

## 部署流程

### 方式一：手动部署

如果你不想使用 GitHub Actions，也可以手动部署到服务器。

**1. 克隆源码并安装依赖**

```bash
ssh username@host
git clone https://github.com/hanlife02/Astro-star.git
cd Astro-star
pnpm install
```

**2. 配置环境变量**

在项目根目录创建 `.env` 文件：

```bash
# Waline 评论服务地址
WALINE_SERVER_URL=https://comment.example.com

# GitHub API token
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# CodeTime token
CODETIME_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Algolia 索引同步（仅 pnpm algolia:sync 时需要）
ALGOLIA_WRITE_API_KEY=xxxxxxxxxxxxxxxx
ALGOLIA_ADMIN_API_KEY=xxxxxxxxxxxxxxxx
```

**3. 构建与运行**

```bash
pnpm check
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
```

默认端口为 `4321`，可通过环境变量修改：

```bash
PORT=3000 pm2 start ecosystem.config.cjs
pm2 save
```

常用运维命令：

```bash
pm2 status
pm2 logs Blog
pm2 restart Blog
pm2 stop Blog
```

本地开发预览可使用 `pnpm dev`，访问 `http://localhost:4321`。

### 方式二：GitHub Actions 自动部署（推荐）

### 1. fork repo

打开 [项目地址](https://github.com/hanlife02/Astro-star)并 fork repo

![fork](/figures/fork.png)

### 2. clone repo

将 fork 后的 repo clone 到本地

```shell
git clone [fork-repo]
# 例如 git clone https://github.com/hanlife02/Astro-star.git
# 将 hanlife02 替换成你的 github uername
```

### fork 后确认部署分支

打开你 fork 仓库里的 `.github/workflows/deploy.yml`，确认触发部署的分支：

```yaml
on:
  push:
    branches: [main]
```

普通 fork 建议保留或改成 `main`，因为你的 fork 通常会从默认分支部署。上游维护者仓库可能会把个人内容分支设为 `Ethan`，这样可以把 `main` 保留为可复用的主题模板。

### 3. 修改配置

关于修改配置，你可以参考[配置修改](./config.md)这一节内容

### 4. 修改文章内容

关于修改文章，你可以参考[创作内容](../creation/content.md)这一节内容

### 5. 设置 Actions secrets

在 github 打开你 fork 的 repo ,按照下图依次设置下面的 Secrets

![1](/figures/1.png)

![2](/figures/2.png)

![3](/figures/3.png)

必须：

| Secret            | 说明                 |
| ----------------- | -------------------- |
| `SSH_HOST`        | 服务器公网 IP 或域名 |
| `SSH_PRIVATE_KEY` | 部署用 SSH 私钥      |

可选 Secrets (根据需求添加)：

| Secret                     | 默认值         | 说明                             |
| -------------------------- | -------------- | -------------------------------- |
| `SSH_USER`                 | `ubuntu`       | SSH 用户                         |
| `SSH_PORT`                 | `22`           | SSH 端口                         |
| `DEPLOY_PATH`              | `~/Astro-star` | 部署到服务器的目录               |
| `PM2_APP_NAME`             | `Astro-star`   | PM2 应用名称                     |
| `APP_PORT`                 | `4321`         | Node 服务端口                    |
| `PUBLIC_WALINE_SERVER_URL` | 空             | 写入服务器 `.env` 的 Waline 地址 |
| `ALGOLIA_ADMIN_API_KEY`    | 空             | Algolia 的管理密钥               |
| `ALGOLIA_WRITE_API_KEY`    | 空             | Algolia 的写入密钥               |

### 6. 推送修改

将 3 和 4 中的修改提交，并推送到 github 远程 repo

```shell
git add .
git commit -m "first deploy"
git push
```

### 7. 检查是否部署成功

打开 action ，查看是否有顺利部署

![4](/figures/4.png)

如果正确部署，则你的服务器 4321 端口(或你设置的端口)已经成功运行上你的服务

如果你会的话，可以去服务器检查端口服务是否正常运行

### 8. 配置域名解析

这里以在阿里云注册的域名为例，将已经备案后的域名解析到对应的服务器，可以参考文档：

[阿里云文档](https://help.aliyun.com/zh/dws/getting-started/configure-domain-name-resolution)

![5](/figures/5.png)

### 9. 反向代理配置

关于反向代理配置，你可以参考[反向代理配置](./proxy.md)

## Congratulations!

你可以打开配置完反向代理的域名,此时正确显示你的博客主页，则恭喜你已经完成了全部的部署工作！

如果你需要接入 waline 或 algolia，可以参考 [Waline 接入](./waline.md) 和 [Algolia 接入](./algolia.md)
