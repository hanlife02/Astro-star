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

export interface LinksPageConfig {
  title: string;
  intro: string;
  friendsTitle: string;
  lostTitle: string;
  applyTitle: string;
  applyOwner: {
    name: string;
    description: string;
    href: string;
    avatarSrc: string;
  };
  applyRules: readonly string[];
}

export const linksPage = {
  title: "Links",
  intro: "Add friends, collaborators, and useful sites here.",
  friendsTitle: "Friends",
  lostTitle: "Lost",
  applyTitle: "Apply",
  applyOwner: {
    name: "Your Name",
    description: "A short line about your site.",
    href: "https://example.com",
    avatarSrc: "/avatar.svg",
  },
  applyRules: [
    "Replace these rules with your own friend link policy.",
    "Include your site name, description, URL, and avatar when applying.",
    "Please keep sites reachable over HTTPS.",
  ],
} satisfies LinksPageConfig;

export const friendLinks = [
  {
    name: "Astro",
    description: "The web framework for content-driven websites.",
    href: "https://astro.build/",
    avatarSrc: "https://astro.build/favicon.svg",
  },
  {
    name: "Ethan",
    description: "Don't stay awake for too long",
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
