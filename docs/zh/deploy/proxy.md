---
order: 40
---

注：此页为 AIGC，仅供参考 (因为反向代理配置方法很多，可以自行搜索)

# 反向代理配置

Astro-star 运行在服务器的 `4321` 端口（或你自定义的端口），需要通过反向代理将域名指向这个端口。下面提供三种方式，任选其一即可。

## 方式一：宝塔面板

如果你的服务器安装了[宝塔面板](https://www.bt.cn/)，可以通过纯界面操作完成配置。

### 1. 添加站点

进入 **网站** → **添加站点**，填写：

- **域名**：输入你的域名（如 `example.com`）
- **根目录**：随意指定即可，后续会通过反代转发
- 点击 **提交**

### 2. 设置反向代理

进入刚创建的站点 → **反向代理** → **添加反向代理**：

| 字段     | 值                      |
| -------- | ----------------------- |
| 代理名称 | `Astro-star`            |
| 目标 URL | `http://127.0.0.1:4321` |
| 发送域名 | `$host`                 |

其他保持默认，点击 **提交**。

### 3. 配置 SSL

进入站点 → **SSL** → **Let's Encrypt**：

- 选择 **文件验证**
- 勾选你的域名
- 点击 **申请**

申请成功后，开启 **强制 HTTPS**。

---

## 方式二：1Panel

如果你的服务器安装了 [1Panel](https://1panel.cn/)，操作同样简单。

### 1. 创建网站

进入 **网站** → **创建网站**：

- **域名**：输入你的域名
- **其他**：暂不填写
- 点击 **确认**

### 2. 设置反向代理

进入网站详情 → **反向代理** → **创建反向代理**：

| 字段     | 值                      |
| -------- | ----------------------- |
| 名称     | `Astro-star`            |
| 代理地址 | `http://127.0.0.1:4321` |

点击 **确认**。

### 3. 配置 HTTPS

进入网站详情 → **HTTPS** → **启用 HTTPS**：

- 选择 **自动申请 Let's Encrypt 证书**
- 勾选你的域名
- 点击 **保存**

---

## 方式三：手写配置

如果你没有安装任何面板，可以直接手写 Nginx 或 Caddy 配置。

### Nginx

#### 安装 Nginx

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install nginx -y

# CentOS / RHEL
sudo yum install nginx -y
```

#### 添加站点配置

创建配置文件：

```bash
sudo vim /etc/nginx/sites-available/astro-star
```

写入以下内容（将 `example.com` 替换为你的域名）：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（开发时可开启）
        # proxy_set_header Upgrade $http_upgrade;
        # proxy_set_header Connection "upgrade";
    }
}
```

#### 启用站点

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/astro-star /etc/nginx/sites-enabled/

# 测试配置是否正确
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 配置 HTTPS

使用 Certbot 自动申请免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 一键申请并自动配置
sudo certbot --nginx -d example.com

# 设置自动续期
sudo systemctl enable certbot.timer
```

完成后访问 `https://example.com` 即可看到站点。

### Caddy

Caddy 自动管理 SSL 证书，配置更简单。

#### 安装 Caddy

```bash
# Ubuntu / Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y
```

> 其他系统安装方式请参考 [Caddy 官方文档](https://caddyserver.com/docs/install)。

#### 配置 Caddyfile

编辑 Caddyfile：

```bash
sudo vim /etc/caddy/Caddyfile
```

写入以下内容：

```caddy
example.com {
    reverse_proxy 127.0.0.1:4321
}
```

#### 启动 Caddy

```bash
sudo systemctl reload caddy
```

Caddy 会自动申请和续期 SSL 证书，无需额外操作。享受 HTTPS 即可。
