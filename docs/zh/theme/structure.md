---
order: 20
---

# 项目结构

希望一个清晰的结构能减少了解的时间成本

## 目录地图

```text
/
├── public/                 # 静态资源、头像、站点图标、文章图片
├── scripts/                # 配置迁移、索引同步和构建辅助脚本
├── src/
│   ├── components/         # 可复用组件
│   ├── config/             # 站点、关于、友链和搜索的配置
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

## 固定路由

| 路径       | 说明 |
| ---------- | ---- |
| `/`        | 首页 |
| `/about`   | 关于 |
| `/blog`    | 博文 |
| `/note`    | 手记 |
| `/project` | 项目 |
| `/links`   | 友链 |
