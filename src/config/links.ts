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
  name: "Astro-star",
  description: "A personal site built with Astro-star.",
  href: "https://example.com",
  avatarSrc: "https://example.com/avatar.svg",
} satisfies LinkApplyOwner;

export const friendLinks = [
  {
    name: "Example Site",
    description: "A sample friend link. Replace it with your own links.",
    href: "https://example.org",
    avatarSrc: "https://example.org/avatar.svg",
  },
] satisfies readonly FriendLinkItem[];

export const lostLinks = [
  {
    name: "Example Offline Site",
    description: "A placeholder entry for links that are temporarily offline.",
    href: "https://example.com/offline",
  },
] satisfies readonly LostLinkItem[];
