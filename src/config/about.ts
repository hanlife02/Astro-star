export interface AboutPanelItem {
  icon: string;
  name: string;
  description: string;
  href?: string;
}

export interface AboutTimelineYear {
  label: string;
  events: readonly string[];
  summary?: string;
}

export interface AboutPageConfig {
  title: string;
  introTitle: string;
  introParagraphs: readonly string[];
  socialTitle: string;
  socialItems: readonly AboutPanelItem[];
  toolsTitle: string;
  toolItems: readonly AboutPanelItem[];
  blogTitle: string;
  timelineTitle: string;
  timeline: readonly AboutTimelineYear[];
}

export const aboutPage = {
  title: "About Me",
  introTitle: "Intro",
  introParagraphs: [
    "This page is a starter profile for your personal site.",
    "Replace these paragraphs with your background, interests, current work, and the kinds of notes you want to publish.",
  ],
  socialTitle: "Social",
  socialItems: [
    {
      icon: "GH",
      name: "GitHub",
      description: "Code and projects",
      href: "https://github.com/",
    },
    {
      icon: "@",
      name: "Email",
      description: "Direct contact",
      href: "mailto:hello@example.com",
    },
    {
      icon: "RSS",
      name: "RSS",
      description: "Feed updates",
      href: "/rss.xml",
    },
    {
      icon: "WEB",
      name: "Website",
      description: "Personal homepage",
      href: "https://example.com",
    },
  ],
  toolsTitle: "Tools",
  toolItems: [
    {
      icon: "AS",
      name: "Astro",
      description: "Site framework",
      href: "https://astro.build/",
    },
    {
      icon: "MD",
      name: "Markdown",
      description: "Writing format",
      href: "https://www.markdownguide.org/",
    },
    {
      icon: "TS",
      name: "TypeScript",
      description: "Typed JavaScript",
      href: "https://www.typescriptlang.org/",
    },
    {
      icon: "RSS",
      name: "RSS",
      description: "Content feed",
      href: "/rss.xml",
    },
  ],
  blogTitle: "About This Site",
  timelineTitle: "Timeline",
  timeline: [
    {
      label: "2026: Start",
      events: [
        "Fork Astro-star",
        "Replace the placeholder profile, content, and links",
        "Deploy the site",
      ],
      summary:
        "Use this timeline to record important changes in your site, writing, projects, or personal milestones.",
    },
  ],
} satisfies AboutPageConfig;
