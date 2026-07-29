---
order: 20
---

# Configuration Modification

All configurable files are located under the `src/config/` directory. There are 5 files in total:

## 1. site.ts -- Global Site Configuration

Modify site name, personal info, navigation bar, ICP filing number, etc.

Personal info (profile):

```ts
profile: {
  name: "Ethan",                              // Your name
  email: "ethan@hanlife02.com",               // Email
  githubUsername: "hanlife02",                // GitHub username
  avatarSrc: "/avatar.svg",                   // Avatar path (place under public/)
  bio: "Don't stay awake for too long.",      // One-line bio
  intro: "Hi, I'm Ethan...",                  // Detailed self-introduction
  bilibiliId: "",                             // Bilibili UID
  cloudMusicId: "",                           // NetEase Cloud Music UID
  codetime: "32471",                          // CodeTime stats ID
  signatureSvg: '<svg>...</svg>',             // Top-left signature SVG
```

Site info (site):

```ts
site: {
  name: "Ethan",                              // Site name
  url: "https://hanlife02.com",               // Site URL
  description: "Ethan's personal blog...",    // SEO description
  iconSrc: "/site-icon.svg",                  // Site icon
  startYear: 2026,                            // Year the site was founded
  beian: {
    icp: { text: "京ICP备...", href: "..." }, // ICP filing (remove the entire beian field if not needed)
    moe: { text: "萌ICP备...", href: "..." }, // Moe ICP filing (remove if not needed)
  },
  codeRainKeywords: ["git","C","C++",...],    // Keywords displayed in the code rain background on /about page
  nav: [                                      // Navigation bar links
    { label: "About", href: "/about/" },
    { label: "Blog", href: "/blog/" },
    // ...add or remove as needed
  ],
},
```

Article footer actions (articleActions):

```ts
articleActions: {
  license: {
    name: "CC BY-NC-SA 4.0 - NonCommercial-ShareAlike 4.0 International", // License name
    href: "https://creativecommons.org/licenses/by-nc-sa/4.0/", // License URL
    statement:
      "For commercial reuse, contact the site owner for authorization. For non-commercial reuse, cite the source and article link. You may copy, distribute, modify, and build upon the work, but derivative works must use the same license.", // Copyright notice shown on hover
  },
  reward: {
    wechatQrSrc: "/reward/wechat.png",        // WeChat reward QR code, stored under public/reward/
    alipayQrSrc: "/reward/alipay.png",        // Alipay reward QR code, stored under public/reward/
  },
},
```

If both `wechatQrSrc` and `alipayQrSrc` are empty, the reward icon is hidden. If only one is configured, only that QR code is shown.

## 2. social.ts -- Social Links Configuration

Configure the social links displayed on the site (email, GitHub, Bilibili, Telegram, etc.).

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

Set `enabled: false` to hide a social link. Supported icons: `mail`, `github`, `bilibili`, `telegram`.

## 3. about.ts -- About Page Configuration

Modify personal intro, social links, toolchain, and timeline on the About page.

```ts
export const aboutPage = {
  title: 'About Me', // Page title
  introTitle: 'Intro', // Intro section title
  introParagraphs: [
    // Self-introduction paragraphs (array, each item is a paragraph)
    "Hi , I'm Ethan , a third-year student at Peking University.",
    'I enjoy learning how to code...'
  ],
  socialTitle: 'Social', // Social section title
  socialItems: [
    // Social links
    {
      icon: 'GH', // Icon code (GH=GitHub, @=Email, RSS=RSS, TG=Telegram)
      name: 'GitHub', // Name
      description: 'Code hub', // Description
      href: 'https://github.com/' // Link
    }
    // ...add or remove as needed
  ],
  toolsTitle: 'Tools', // Tools section title
  toolItems: [
    // Toolchain
    {
      icon: 'AS', // Icon code (AS=Astro, OB=Obsidian, VS=VS Code, FG=Figma)
      name: 'Astro',
      description: 'Static web',
      href: 'https://astro.build/'
    }
    // ...add or remove as needed
  ],
  blogTitle: 'About Blog', // Blog intro section title
  timelineTitle: 'Timeline', // Timeline section title
  timeline: [
    // Timeline
    {
      label: '2024 : Embark on...', // Year label
      events: [
        // Event list
        '06.12 - The first domain...',
        '07.02 - Using the Shiro theme...'
      ]
    },
    {
      label: '2026 - now : A new attempt',
      events: ['03.08 - New theme...'],
      summary: "I don't have much..." // Optional: summary paragraph for this year
    }
    // ...add or remove as needed
  ]
}
```

Icon code reference: Social section supports GH / @ / RSS / TG; Tools section supports AS / OB / VS / FG. For additional icons, modify the corresponding Icon component.

## 4. links.ts -- Friend Links Page Configuration

Modify the friend links page text, friend links list, "lost links" list, and application rules.

Page text:

```ts
export const linksPage = {
  title: 'Links', // Page title
  intro: 'The order is random~', // Top description text
  friendsTitle: 'Friends', // Friends section title
  lostTitle: 'Lost', // Lost section title
  applyTitle: 'Apply', // Apply section title
  applyOwner: {
    // Your own info displayed in the apply section
    name: 'Ethan',
    description: "Don't stay awake for too long.",
    href: 'https://hanlife02.com',
    avatarSrc: 'https://hanlife02.com/avatar.svg'
  },
  applyRules: [
    // Friend link application rules
    'Before applying, make sure your site...'
    // ...modify as needed
  ]
}
```

Friend links list:

```ts
export const friendLinks = [
  {
    name: '', // Site name
    description: '', // Description
    href: '', // Link
    avatarSrc: '' // Avatar URL (supports external links or local /figures/ directory)
  }
  // ...add or remove as needed
]
```

Lost links list:

```ts
export const lostLinks = [
  {
    name: '', // Site name
    description: '', // Description
    href: '' // Destination link
  }
  // ...add or remove as needed
]
```

Note: Links moved to lostLinks do not need the avatarSrc field.

## 5. search.ts -- Algolia Search Configuration (Optional)

Refer to [Algolia Integration](./algolia.md).

Configure Algolia DocSearch or SiteSearch.

```ts
export const algoliaSiteSearchConfig = {
  applicationId: '', // Algolia App ID
  apiKey: '', // Search API Key (can be public)
  indexName: '', // Index name
  attributes: {
    primaryText: 'url', // Search box primary text field
    secondaryText: 'headline', // Search box secondary text field
    tertiaryText: undefined, // Search box third line field
    url: 'url', // Result link field
    image: undefined // Result image field
  },
  darkMode: false // Force dark mode for search modal
}
```

If you don't need the search feature, set any of applicationId, apiKey, or indexName to empty, and the system will automatically hide the search entry.
