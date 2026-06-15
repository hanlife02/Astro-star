import type { SocialLinkId, SocialLinkItem } from "../types/social";

export const socialLinks: readonly SocialLinkItem[] = [
  {
    id: "mail",
    icon: "mail",
    name: "Mail",
    href: "mailto:ethan@hanlife02.com",
    handle: "ethan@hanlife02.com",
    enabled: true,
  },
  {
    id: "github",
    icon: "github",
    name: "GitHub",
    href: "https://github.com/hanlife02",
    handle: "hanlife02",
    enabled: true,
  },
  {
    id: "bilibili",
    icon: "bilibili",
    name: "Bilibili",
    href: "https://space.bilibili.com/1546192745",
    handle: "1546192745",
    enabled: true,
  },
  {
    id: "telegram",
    icon: "telegram",
    name: "Telegram",
    href: "https://t.me/hanlife02",
    handle: "hanlife02",
    enabled: true,
  },
] satisfies readonly SocialLinkItem[];

export const socialDisplay = {
  home: ["github", "mail"],
  about: ["mail", "github", "bilibili", "telegram"],
} as const satisfies Record<string, readonly SocialLinkId[]>;
