---
order: 40
---

Note: This page is AIGC, for reference only (since there are many ways to configure reverse proxy, feel free to search on your own).

# Reverse Proxy Configuration

Astro-star runs on the server's port `4321` (or your custom port). You need to point your domain to this port via a reverse proxy. Three methods are provided below -- choose one.

## Method 1: BT Panel

If your server has [BT Panel](https://www.bt.cn/) installed, you can complete the configuration entirely through the UI.

### 1. Add a Site

Go to **Website** -> **Add Site**, and fill in:

- **Domain**: Enter your domain (e.g., `example.com`)
- **Document Root**: Can be arbitrary -- requests will be forwarded via reverse proxy
- Click **Submit**

### 2. Set Up Reverse Proxy

Go to the newly created site -> **Reverse Proxy** -> **Add Reverse Proxy**:

| Field       | Value                   |
| ----------- | ----------------------- |
| Proxy Name  | `Astro-star`            |
| Target URL  | `http://127.0.0.1:4321` |
| Send Domain | `$host`                 |

Leave other settings as default and click **Submit**.

### 3. Configure SSL

Go to the site -> **SSL** -> **Let's Encrypt**:

- Choose **File Validation**
- Check your domain
- Click **Apply**

After the certificate is issued, enable **Force HTTPS**.

---

## Method 2: 1Panel

If your server has [1Panel](https://1panel.cn/) installed, the process is equally simple.

### 1. Create a Website

Go to **Website** -> **Create Website**:

- **Domain**: Enter your domain
- **Others**: Leave blank for now
- Click **Confirm**

### 2. Set Up Reverse Proxy

Go to website details -> **Reverse Proxy** -> **Create Reverse Proxy**:

| Field         | Value                   |
| ------------- | ----------------------- |
| Name          | `Astro-star`            |
| Proxy Address | `http://127.0.0.1:4321` |

Click **Confirm**.

### 3. Configure HTTPS

Go to website details -> **HTTPS** -> **Enable HTTPS**:

- Select **Auto-apply Let's Encrypt Certificate**
- Check your domain
- Click **Save**

---

## Method 3: Manual Configuration

If you don't have any panel installed, you can write Nginx or Caddy configuration directly.

### Nginx

#### Install Nginx

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install nginx -y

# CentOS / RHEL
sudo yum install nginx -y
```

#### Add Site Configuration

Create a configuration file:

```bash
sudo vim /etc/nginx/sites-available/astro-star
```

Write the following content (replace `example.com` with your domain):

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

        # WebSocket support (enable during development)
        # proxy_set_header Upgrade $http_upgrade;
        # proxy_set_header Connection "upgrade";
    }
}
```

#### Enable the Site

```bash
# Create a symlink
sudo ln -s /etc/nginx/sites-available/astro-star /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Configure HTTPS

Use Certbot to automatically apply for a free SSL certificate:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# One-click apply and auto-configure
sudo certbot --nginx -d example.com

# Enable auto-renewal
sudo systemctl enable certbot.timer
```

Once complete, visit `https://example.com` to see your site.

### Caddy

Caddy manages SSL certificates automatically, making the configuration even simpler.

#### Install Caddy

```bash
# Ubuntu / Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y
```

> For installation on other systems, refer to the [Caddy Official Docs](https://caddyserver.com/docs/install).

#### Configure Caddyfile

Edit the Caddyfile:

```bash
sudo vim /etc/caddy/Caddyfile
```

Write the following content:

```caddy
example.com {
    reverse_proxy 127.0.0.1:4321
}
```

#### Start Caddy

```bash
sudo systemctl reload caddy
```

Caddy will automatically apply for and renew SSL certificates -- no additional steps needed. Enjoy HTTPS.
