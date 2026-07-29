---
order: 20
---

# 配置修改

所有可修改的配置文件位于 src/config/ 目录下，共 5 个文件：

## 1. site.ts — 站点全局配置

修改站点名称、个人信息、导航栏、备案号等。

个人信息（profile）：

```ts
profile: {
  name: "Ethan",                              // 你的名字
  email: "ethan@hanlife02.com",               // 邮箱
  githubUsername: "hanlife02",                // GitHub 用户名
  avatarSrc: "/avatar.svg",                   // 头像路径（放在 public/ 下）
  bio: "Don't stay awake for too long.",      // 一句话简介
  intro: "Hi, I'm Ethan...",                  // 详细自我介绍
  bilibiliId: "",                             // B站 UID
  cloudMusicId: "",                           // 网易云音乐 UID
  codetime: "32471",                          // CodeTime 统计 ID
  signatureSvg: '<svg>...</svg>',             // 左上角签名 SVG
```

站点信息（site）：

```ts
site: {
  name: "Ethan",                              // 站点名称
  url: "https://hanlife02.com",               // 站点 URL
  description: "Ethan's personal blog...",    // SEO 描述
  iconSrc: "/site-icon.svg",                  // 站点图标
  startYear: 2026,                            // 建站年份
  beian: {
    icp: { text: "京ICP备...", href: "..." }, // ICP 备案（不需要可删除整个 beian 字段）
    moe: { text: "萌ICP备...", href: "..." }, // 萌ICP 备案（不需要可删除）
  },
  codeRainKeywords: ["git","C","C++",...],    // /about 页代码雨背景的显示关键字
  nav: [                                      // 导航栏链接
    { label: "About", href: "/about/" },
    { label: "Blog", href: "/blog/" },
    // ...按需增删
  ],
},
```

文章末尾操作（articleActions）：

```ts
articleActions: {
  license: {
    name: "CC BY-NC-SA 4.0 - 非商业性使用 - 相同方式共享 4.0 国际", // 版权协议名称
    href: "https://creativecommons.org/licenses/by-nc-sa/4.0/", // 协议链接
    statement:
      "商业转载请联系站长获得授权，非商业转载请注明本文出处及文章链接，您可以自由地在任何媒体以任何形式复制和分发作品，也可以修改和创作，但是分发衍生作品时必须采用相同的许可协议。", // Hover 显示的版权说明
  },
  reward: {
    wechatQrSrc: "/reward/wechat.png",        // 微信赞赏二维码，图片放在 public/reward/ 下
    alipayQrSrc: "/reward/alipay.png",        // 支付宝赞赏二维码，图片放在 public/reward/ 下
  },
},
```

▎ 如果 `wechatQrSrc` 和 `alipayQrSrc` 都为空，文章末尾不会显示赞赏图标；只配置其中一个时，只显示对应二维码。

## 2. social.ts — 社交链接配置

配置站点展示的社交链接（邮箱、GitHub、B 站、Telegram 等）。

```ts
export interface SocialLinkItem {
  id: string
  icon: string
  name: string
  href: string
  enabled: boolean
}

export const socialLinks = [
  {
    id: 'mail',
    icon: 'mail',
    name: 'Mail',
    href: 'mailto:hello@example.com',
    enabled: true
  },
  {
    id: 'github',
    icon: 'github',
    name: 'GitHub',
    href: 'https://github.com/your-name',
    enabled: true
  },
  {
    id: 'bilibili',
    icon: 'bilibili',
    name: 'Bilibili',
    href: 'https://space.bilibili.com/000000',
    enabled: true
  },
  {
    id: 'telegram',
    icon: 'telegram',
    name: 'Telegram',
    href: 'https://t.me/your-name',
    enabled: true
  }
] satisfies readonly SocialLinkItem[]
```

将 `enabled` 设为 `false` 可隐藏对应社交链接。支持的图标：`mail`、`github`、`bilibili`、`telegram`。

## 3. about.ts — About 页面配置

修改 About 页的个人介绍、社交链接、工具链、时间线。

```ts
export const aboutPage = {
  title: 'About Me', // 页面标题
  introTitle: 'Intro', // 介绍区标题
  introParagraphs: [
    // 自我介绍段落（数组，每项一个段落）
    "Hi , I'm Ethan , a third-year student at Peking University.",
    'I enjoy learning how to code...'
  ],
  socialTitle: 'Social', // 社交区标题
  socialItems: [
    // 社交链接
    {
      icon: 'GH', // 图标代号（GH=GitHub, @=Email, RSS=RSS, TG=Telegram）
      name: 'GitHub', // 名称
      description: 'Code hub', // 描述
      href: 'https://github.com/' // 链接
    }
    // ...按需增删
  ],
  toolsTitle: 'Tools', // 工具区标题
  toolItems: [
    // 工具链
    {
      icon: 'AS', // 图标代号（AS=Astro, OB=Obsidian, VS=VS Code, FG=Figma）
      name: 'Astro',
      description: 'Static web',
      href: 'https://astro.build/'
    }
    // ...按需增删
  ],
  blogTitle: 'About Blog', // 博客介绍区标题
  timelineTitle: 'Timeline', // 时间线区标题
  timeline: [
    // 时间线
    {
      label: '2024 : Embark on...', // 年份标签
      events: [
        // 事件列表
        '06.12 - The first domain...',
        '07.02 - Using the Shiro theme...'
      ]
    },
    {
      label: '2026 - now : A new attempt',
      events: ['03.08 - New theme...'],
      summary: "I don't have much..." // 可选：该年份的总结段落
    }
    // ...按需增删
  ]
}
```

图标代号对照：社交区支持 GH / @ / RSS / TG；工具区支持 AS / OB / VS / FG。如需更多图标需要修改对应的 Icon 组件。

## 4. links.ts — 友链页面配置

修改友链页面文案、友链列表、"失联链接"列表、申请规则。

页面文案：

```ts
export const linksPage = {
  title: 'Links', // 页面标题
  intro: 'The order is random~', // 顶部说明文字
  friendsTitle: 'Friends', // 友链区标题
  lostTitle: 'Lost', // 失联区标题
  applyTitle: 'Apply', // 申请区标题
  applyOwner: {
    // 申请区展示的你自己的信息
    name: 'Ethan',
    description: "Don't stay awake for too long.",
    href: 'https://hanlife02.com',
    avatarSrc: 'https://hanlife02.com/avatar.svg'
  },
  applyRules: [
    // 友链申请规则
    'Before applying, make sure your site...'
    // ...按需修改
  ]
}
```

友链列表：

```ts
export const friendLinks = [
  {
    name: '', // 站点名
    description: '', // 描述
    href: '', // 链接
    avatarSrc: '' // 头像 URL（支持外链或本地 /figures/ 目录）
  }
  // ...按需增删
]
```

失联链接列表：

```ts
export const lostLinks = [
  {
    name: '', // 站点名
    description: '', // 描述
    href: '' // 对方链接
  }
  // ...按需增删
]
```

▎ 注意：被移动到 lostLinks 的链接不需要 avatarSrc 字段。

## 5. search.ts — Algolia 搜索配置 (非必须)

参考 [Algolia 接入](./algolia.md)

配置 Algolia DocSearch 或 SiteSearch。

```ts
export const algoliaSiteSearchConfig = {
  applicationId: '', // Algolia App ID
  apiKey: '', // 搜索 API Key（可公开的）
  indexName: '', // 索引名称
  attributes: {
    primaryText: 'url', // 搜索框主文本字段
    secondaryText: 'headline', // 搜索框副文本字段
    tertiaryText: undefined, // 搜索框第三行字段
    url: 'url', // 结果链接字段
    image: undefined // 结果图片字段
  },
  darkMode: false // 搜索弹窗是否强制暗色
}
```

▎ 如果不需要搜索功能，将 applicationId、apiKey、indexName 之一置空即可，系统会自动隐藏搜索入口。
