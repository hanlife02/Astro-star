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
  name: "Your Name",
  description: "A short line about your site.",
  href: "https://example.com",
  avatarSrc: "/avatar.svg",
} satisfies LinkApplyOwner;

export const friendLinks = [
  {
    name: "Astro",
    description: "The web framework for content-driven websites.",
    href: "https://astro.build/",
    avatarSrc: "https://astro.build/favicon.svg",
  },
  {
    name: "Example Friend",
    description: "Replace this entry with a real friend link.",
    href: "https://example.com",
    avatarSrc: "/avatar.svg",
  },
] satisfies readonly FriendLinkItem[];

export const lostLinks = [
  {
    name: "Example Offline Site",
    description: "A placeholder entry for links that are temporarily offline.",
    href: "https://example.com/offline",
  },
] satisfies readonly LostLinkItem[];
