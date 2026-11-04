import type { SocialLinkId, SocialLinkItem } from "../types/social";

export const socialLinks: readonly SocialLinkItem[] = [
  {
    id: "mail",
    icon: "mail",
    name: "Mail",
    href: "mailto:hello@example.com",
    handle: "hello@example.com",
    enabled: true,
  },
  {
    id: "github",
    icon: "github",
    name: "GitHub",
    href: "https://github.com/your-name",
    handle: "your-name",
    enabled: true,
  },
  {
    id: "bilibili",
    icon: "bilibili",
    name: "Bilibili",
    href: "https://space.bilibili.com/000000",
    handle: "000000",
    enabled: true,
  },
  {
    id: "telegram",
    icon: "telegram",
    name: "Telegram",
    href: "https://t.me/your-name",
    handle: "your-name",
    enabled: true,
  },
] satisfies readonly SocialLinkItem[];

export const socialDisplay = {
  home: ["github", "mail"],
} as const satisfies Record<string, readonly SocialLinkId[]>;
