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

function resolveCodeTimeId(profile = {}) {
  if (typeof profile.codetime === "string") return profile.codetime;

  const legacyBadgeSrc =
    typeof profile.codeTimeBadgeSrc === "string" ? profile.codeTimeBadgeSrc : "";
  const uidMatch = legacyBadgeSrc.match(/uid(?:%3D|=)(\d+)/i);

  return uidMatch?.[1] ?? "";
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
        codetime: resolveCodeTimeId(input.profile),
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
      codetime: resolveCodeTimeId(legacyProfile),
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

// --- 3. Generate src/config/about.ts ---
writeFileSyncSafe(
  resolve(ROOT, "src/config/about.ts"),
  [
    `export interface AboutPanelItem {`,
    `  icon: string;`,
    `  name: string;`,
    `  description: string;`,
    `  href?: string;`,
    `}`,
    ``,
    `export interface AboutTimelineYear {`,
    `  label: string;`,
    `  events: readonly string[];`,
    `  summary?: string;`,
    `}`,
    ``,
    `export interface AboutPageConfig {`,
    `  title: string;`,
    `  introTitle: string;`,
    `  introParagraphs: readonly string[];`,
    `  socialTitle: string;`,
    `  socialItems: readonly AboutPanelItem[];`,
    `  toolsTitle: string;`,
    `  toolItems: readonly AboutPanelItem[];`,
    `  blogTitle: string;`,
    `  timelineTitle: string;`,
    `  timeline: readonly AboutTimelineYear[];`,
    `}`,
    ``,
    `export const aboutPage = ${toTS(config.about)} satisfies AboutPageConfig;`,
    ``,
  ].join("\n"),
  "utf-8",
);
console.log("Written: src/config/about.ts");

// --- 4. Generate src/config/links.ts ---
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
    `export interface LinksPageConfig {`,
    `  title: string;`,
    `  intro: string;`,
    `  friendsTitle: string;`,
    `  lostTitle: string;`,
    `  applyTitle: string;`,
    `  applyOwner: {`,
    `    name: string;`,
    `    description: string;`,
    `    href: string;`,
    `    avatarSrc: string;`,
    `  };`,
    `  applyRules: readonly string[];`,
    `}`,
    ``,
    `export const linksPage = ${toTS(config.links.page)} satisfies LinksPageConfig;`,
    ``,
    `export const friendLinks = ${toTS(config.links.friendLinks)} satisfies readonly FriendLinkItem[];`,
    ``,
    `export const lostLinks = ${toTS(config.links.lostLinks)} satisfies readonly LostLinkItem[];`,
    ``,
  ].join("\n"),
  "utf-8",
);
console.log("Written: src/config/links.ts");

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
  "src/config/about.ts",
  "src/config/links.ts",
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
