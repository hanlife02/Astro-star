import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extract as extractTarball } from "tar";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- 1. Read user-config.json ---
const jsonPath = resolve(ROOT, "src/data/user-config.json");
if (!existsSync(jsonPath)) {
  console.error("Error: src/data/user-config.json not found.");
  console.error(
    'Copy user-config.example.json → user-config.json, edit it, then run "pnpm run config:apply".',
  );
  process.exit(1);
}

const config = JSON.parse(readFileSync(jsonPath, "utf-8"));
const toTS = (obj) => JSON.stringify(obj, null, 2);

const defaultArticleActions = {
  license: {
    name: "CC BY-NC-SA 4.0 - 非商业性使用 - 相同方式共享 4.0 国际",
    href: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    statement:
      "商业转载请联系站长获得授权，非商业转载请注明本文出处及文章链接，您可以自由地在任何媒体以任何形式复制和分发作品，也可以修改和创作，但是分发衍生作品时必须采用相同的许可协议。",
  },
  reward: {
    wechatQrSrc: "",
    alipayQrSrc: "",
  },
};

const defaultLinkApplyOwner = {
  name: "Your Name",
  description: "A short line about your site.",
  href: "https://example.com",
  avatarSrc: "/avatar.svg",
};

const defaultSocialLinks = [
  {
    id: "mail",
    icon: "mail",
    name: "Mail",
    href: "mailto:hello@example.com",
    enabled: true,
  },
  {
    id: "github",
    icon: "github",
    name: "GitHub",
    href: "https://github.com/your-name",
    enabled: true,
  },
  {
    id: "bilibili",
    icon: "bilibili",
    name: "Bilibili",
    href: "https://space.bilibili.com/000000",
    enabled: true,
  },
  {
    id: "telegram",
    icon: "telegram",
    name: "Telegram",
    href: "https://t.me/your-name",
    enabled: true,
  },
];

function normalizeArticleActions(articleActions = {}) {
  const input = articleActions ?? {};

  return {
    license: {
      name: input.license?.name ?? defaultArticleActions.license.name,
      href: input.license?.href ?? defaultArticleActions.license.href,
      statement:
        input.license?.statement ?? defaultArticleActions.license.statement,
    },
    reward: {
      wechatQrSrc: input.reward?.wechatQrSrc ?? "",
      alipayQrSrc: input.reward?.alipayQrSrc ?? "",
    },
  };
}

function normalizeSplitSiteConfig(input) {
  if (input?.site?.profile && input?.site?.site) {
    return normalizeSplitSiteConfig(input.site);
  }

  if (input?.profile && input?.site) {
    return {
      profile: {
        name: input.profile.name ?? "",
        email: input.profile.email ?? "",
        githubUsername: input.profile.githubUsername ?? "",
        avatarSrc: input.profile.avatarSrc ?? "",
        bio: input.profile.bio ?? "",
        intro: input.profile.intro ?? "",
        bilibiliId: input.profile.bilibiliId ?? "",
        cloudMusicId: input.profile.cloudMusicId ?? "",
        signatureSvg: input.profile.signatureSvg ?? "",
      },
      site: {
        name: input.site.name ?? "",
        url: input.site.url ?? "",
        description: input.site.description ?? "",
        iconSrc: input.site.iconSrc ?? "",
        startYear: input.site.startYear ?? new Date().getFullYear(),
        beian: input.site.beian ?? {
          icp: { text: "", href: "" },
          moe: { text: "", href: "" },
        },
        monitorLinks: input.site.monitorLinks ?? [],
        codeRainKeywords: input.site.codeRainKeywords ?? [],
        nav: input.site.nav ?? [],
      },
      articleActions: normalizeArticleActions(input.articleActions),
    };
  }

  const legacySite = input?.site ?? input ?? {};
  const legacyProfile = legacySite.profile ?? {};
  const legacyOwner = legacySite.owner ?? {};
  const legacyContact = legacySite.contact ?? {};

  return {
    profile: {
      name: legacyOwner.name ?? legacySite.name ?? "",
      email: legacyProfile.email ?? legacyContact.email ?? "",
      githubUsername:
        legacyProfile.githubUsername ?? legacyContact.githubUsername ?? "",
      avatarSrc: legacyProfile.avatarSrc ?? "",
      bio: legacyProfile.bio ?? "",
      intro: legacyProfile.intro ?? "",
      bilibiliId: legacyProfile.bilibiliId ?? "",
      cloudMusicId: legacyProfile.cloudMusicId ?? "",
      signatureSvg: legacyProfile.signatureSvg ?? "",
    },
    site: {
      name: legacySite.name ?? "",
      url: legacySite.url ?? "",
      description: legacySite.description ?? "",
      iconSrc: legacySite.iconSrc ?? "",
      startYear: legacyOwner.startYear ?? new Date().getFullYear(),
      beian: legacySite.beian ?? {
        icp: { text: "", href: "" },
        moe: { text: "", href: "" },
      },
      monitorLinks: legacySite.monitorLinks ?? [],
      codeRainKeywords: legacyProfile.codeRainKeywords ?? [],
      nav: legacySite.nav ?? [],
    },
    articleActions: normalizeArticleActions(legacySite.articleActions),
  };
}

function normalizeLinksConfig(input = {}) {
  const links = input?.links ?? {};

  return {
    applyOwner:
      links.applyOwner ?? links.page?.applyOwner ?? defaultLinkApplyOwner,
    friendLinks: links.friendLinks ?? [],
    lostLinks: links.lostLinks ?? [],
  };
}

function normalizeSocialConfig(input = {}) {
  const social = input?.social ?? {};
  const socialLinks =
    social.socialLinks ?? input?.socialLinks ?? defaultSocialLinks;

  return {
    socialLinks: socialLinks.map((item = {}) => ({
      id: item.id ?? "",
      icon: item.icon ?? item.id ?? "star",
      name: item.name ?? item.id ?? "Link",
      href: item.href ?? "",
      enabled: item.enabled ?? true,
    })),
  };
}

/** writeFileSync with automatic parent directory creation */
function writeFileSyncSafe(filePath, data, encoding) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, data, encoding);
}

// --- 2. Generate src/config/site.ts ---
const normalizedSiteConfig = normalizeSplitSiteConfig(config);

writeFileSyncSafe(
  resolve(ROOT, "src/config/site.ts"),
  `export const site = ${toTS(normalizedSiteConfig)} as const;\n\nexport type SiteConfig = typeof site;\n`,
  "utf-8",
);
console.log("Written: src/config/site.ts");

// --- 3. Generate src/config/links.ts ---
const normalizedLinksConfig = normalizeLinksConfig(config);

writeFileSyncSafe(
  resolve(ROOT, "src/config/links.ts"),
  [
    `export interface FriendLinkItem {`,
    `  name: string;`,
    `  description: string;`,
    `  href: string;`,
    `  avatarSrc: string;`,
    `}`,
    ``,
    `export interface LostLinkItem {`,
    `  name: string;`,
    `  description: string;`,
    `  href: string;`,
    `}`,
    ``,
    `export interface LinkApplyOwner {`,
    `  name: string;`,
    `  description: string;`,
    `  href: string;`,
    `  avatarSrc: string;`,
    `}`,
    ``,
    `export const linkApplyOwner = ${toTS(normalizedLinksConfig.applyOwner)} satisfies LinkApplyOwner;`,
    ``,
    `export const friendLinks = ${toTS(normalizedLinksConfig.friendLinks)} satisfies readonly FriendLinkItem[];`,
    ``,
    `export const lostLinks = ${toTS(normalizedLinksConfig.lostLinks)} satisfies readonly LostLinkItem[];`,
    ``,
  ].join("\n"),
  "utf-8",
);
console.log("Written: src/config/links.ts");

// --- 4. Generate src/config/social.ts ---
const normalizedSocialConfig = normalizeSocialConfig(config);

writeFileSyncSafe(
  resolve(ROOT, "src/config/social.ts"),
  [
    `export interface SocialLinkItem {`,
    `  id: string;`,
    `  icon: string;`,
    `  name: string;`,
    `  href: string;`,
    `  enabled: boolean;`,
    `}`,
    ``,
    `export const socialLinks = ${toTS(normalizedSocialConfig.socialLinks)} satisfies readonly SocialLinkItem[];`,
    ``,
  ].join("\n"),
  "utf-8",
);
console.log("Written: src/config/social.ts");

// --- 5. Patch rss.xml.ts language ---
const rssPath = resolve(ROOT, "src/pages/rss.xml.ts");
const rssContent = readFileSync(rssPath, "utf-8");
writeFileSyncSafe(
  rssPath,
  rssContent.replace(
    /<language>[\w-]+<\/language>/,
    `<language>${config.rss.language}</language>`,
  ),
  "utf-8",
);
console.log("Written: src/pages/rss.xml.ts");

// --- 6. Extract content archive ---
const tarPath = resolve(ROOT, "src/data/user-content.tar.gz");
if (existsSync(tarPath)) {
  await extractTarball({
    cwd: ROOT,
    file: tarPath,
    gzip: true,
  });
  console.log("Extracted: src/data/user-content.tar.gz");
} else {
  console.log("No user-content.tar.gz found, skipping content restore.");
}

// --- 7. Format modified files with prettier ---
const filesToFormat = [
  "src/config/site.ts",
  "src/config/links.ts",
  "src/config/social.ts",
  "src/pages/rss.xml.ts",
];
try {
  execSync(`npx prettier --write ${filesToFormat.join(" ")}`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  console.log("Formatted with prettier.");
} catch {
  console.warn("Warning: prettier formatting failed (files are still valid).");
}

console.log("\nApply complete!");
