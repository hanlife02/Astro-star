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
    "Hi , I'm Ethan , a third-year student at Peking University.",
    "I enjoy learning how to code during my leisure time, and I am very interested in the AI4S field.",
  ],
  socialTitle: "Social",
  socialItems: [
    {
      icon: "GH",
      name: "GitHub",
      description: "Code hub",
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
      icon: "TG",
      name: "Telegram",
      description: "Quick chat",
      href: "https://telegram.org/",
    },
  ],
  toolsTitle: "Tools",
  toolItems: [
    {
      icon: "AS",
      name: "Astro",
      description: "Static web",
      href: "https://astro.build/",
    },
    {
      icon: "OB",
      name: "Obsidian",
      description: "Knowledge base",
      href: "https://obsidian.md/",
    },
    {
      icon: "VS",
      name: "VS Code",
      description: "Code editor",
      href: "https://code.visualstudio.com/",
    },
    {
      icon: "FG",
      name: "Figma",
      description: "UI design",
      href: "https://www.figma.com/",
    },
  ],
  blogTitle: "About Blog",
  timelineTitle: "Timeline",
  timeline: [
    {
      label: "2024 : Embark on the journey of blogging",
      events: [
        "06.12 - The first domain ---- hanlife02.com.cn",
        "07.02 - Using the Shiro theme",
        "07.21 - Switch to Shiroi theme",
      ],
    },
    {
      label: "2025 : New Journey",
      events: ["03.28 - New domain ---- hanlife02.com"],
    },
    {
      label: "2026 - now : A new attempt",
      events: ["03.08 - New theme ---- Astro-star"],
      summary:
        "I don't have much experience in writing front-end. The theme I've written so far is very rough. I will continue to optimize it.",
    },
  ],
} satisfies AboutPageConfig;
