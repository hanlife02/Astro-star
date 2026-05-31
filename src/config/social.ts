export interface SocialLinkItem {
  id: string;
  icon: string;
  name: string;
  href: string;
  enabled: boolean;
}

export const socialLinks = [
  {
    id: "mail",
    icon: "mail",
    name: "Mail",
    href: "mailto:ethan@hanlife02.com",
    enabled: true,
  },
  {
    id: "github",
    icon: "github",
    name: "GitHub",
    href: "https://github.com/hanlife02",
    enabled: true,
  },
  {
    id: "bilibili",
    icon: "bilibili",
    name: "Bilibili",
    href: "https://space.bilibili.com/1546192745",
    enabled: true,
  },
  {
    id: "telegram",
    icon: "telegram",
    name: "Telegram",
    href: "https://t.me/hanlife02",
    enabled: true,
  },
] satisfies readonly SocialLinkItem[];
