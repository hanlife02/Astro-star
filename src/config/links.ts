export interface FriendLinkItem {
  name: string;
  description: string;
  href: string;
  avatarSrc: string;
}

export interface LostLinkItem {
  name: string;
  description: string;
  href: string;
}

export interface LinkApplyOwner {
  name: string;
  description: string;
  href: string;
  avatarSrc: string;
}

export const linkApplyOwner = {
  name: "Ethan",
  description: "Don't stay awake for too long.",
  href: "https://hanlife02.com",
  avatarSrc: "https://hanlife02.com/avatar.svg",
} satisfies LinkApplyOwner;

export const friendLinks = [
  {
    name: "Ethan",
    description: "Astro-star template user's personal site.",
    href: "https://hanlife02.com",
    avatarSrc: "https://hanlife02.com/avatar.svg",
  },
] satisfies readonly FriendLinkItem[];

export const lostLinks = [
  {
    name: "Example Offline Site",
    description: "A placeholder entry for links that are temporarily offline.",
    href: "https://example.com/offline",
  },
] satisfies readonly LostLinkItem[];
