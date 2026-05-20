export const site = {
  profile: {
    name: "Your Name",
    email: "hello@example.com",
    githubUsername: "your-github-username",
    avatarSrc: "/avatar.svg",
    bio: "A short line about you.",
    intro:
      "Hi, I am building a personal site with Astro-star. Replace this introduction with your own profile, interests, and current work.",
    bilibiliId: "",
    cloudMusicId: "",
    codetime: "",
    signatureSvg: "",
  },
  site: {
    name: "Astro-star",
    url: "https://example.com",
    description:
      "A personal site template for blogs, notes, projects, comments, and friend links.",
    iconSrc: "/site-icon.svg",
    startYear: 2026,
    beian: {
      icp: {
        text: "",
        href: "",
      },
      moe: {
        text: "",
        href: "",
      },
    },
    codeRainKeywords: [
      "Astro",
      "TypeScript",
      "Markdown",
      "MDX",
      "RSS",
      "Blog",
      "Notes",
      "Projects",
      "Open Web",
    ],
    nav: [
      {
        label: "About",
        href: "/about/",
      },
      {
        label: "Blog",
        href: "/blog/",
      },
      {
        label: "Note",
        href: "/note/",
      },
      {
        label: "Project",
        href: "/project/",
      },
      {
        label: "Links",
        href: "/links/",
      },
    ],
  },
} as const;

export type SiteConfig = typeof site;
