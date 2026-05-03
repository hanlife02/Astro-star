import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { create as createTarball } from "tar";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- 1. Import TS configs (requires --experimental-strip-types) ---
const { site } = await import("../src/config/site.ts");
const { aboutPage } = await import("../src/config/about.ts");
const { linksPage, friendLinks, lostLinks } =
  await import("../src/config/links.ts");

function resolveCodeTimeId(profile = {}) {
  if (typeof profile.codetime === "string") return profile.codetime;

  const legacyBadgeSrc =
    typeof profile.codeTimeBadgeSrc === "string"
      ? profile.codeTimeBadgeSrc
      : "";
  const uidMatch = legacyBadgeSrc.match(/uid(?:%3D|=)(\d+)/i);

  return uidMatch?.[1] ?? "";
}

function normalizeSplitSiteConfig(input) {
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

  const legacyProfile = input?.profile ?? {};
  const legacyOwner = input?.owner ?? {};
  const legacyContact = input?.contact ?? {};

  return {
    profile: {
      name: legacyOwner.name ?? input?.name ?? "",
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
      name: input?.name ?? "",
      url: input?.url ?? "",
      description: input?.description ?? "",
      iconSrc: input?.iconSrc ?? "",
      startYear: legacyOwner.startYear ?? new Date().getFullYear(),
      beian: input?.beian ?? {
        icp: { text: "", href: "" },
        moe: { text: "", href: "" },
      },
      monitorLinks: input?.monitorLinks ?? [],
      codeRainKeywords: legacyProfile.codeRainKeywords ?? [],
      nav: input?.nav ?? [],
    },
  };
}

// --- 2. Extract RSS language via regex ---
const rssContent = readFileSync(resolve(ROOT, "src/pages/rss.xml.ts"), "utf-8");
const langMatch = rssContent.match(/<language>([\w-]+)<\/language>/);
const rssLanguage = langMatch ? langMatch[1] : "zh-cn";

// --- 3. Build unified config object ---
const normalizedSiteConfig = normalizeSplitSiteConfig(site);

const config = {
  profile: normalizedSiteConfig.profile,
  site: normalizedSiteConfig.site,
  about: aboutPage,
  links: {
    page: linksPage,
    friendLinks,
    lostLinks,
  },
  rss: { language: rssLanguage },
};

// --- 4. Write user-config.json ---
const dataDir = resolve(ROOT, "src/data");
mkdirSync(dataDir, { recursive: true });

const jsonStr = JSON.stringify(config, null, 2) + "\n";
writeFileSync(resolve(dataDir, "user-config.json"), jsonStr, "utf-8");
console.log("Written: src/data/user-config.json");

copyFileSync(
  resolve(dataDir, "user-config.json"),
  resolve(dataDir, "user-config.example.json"),
);
console.log("Written: src/data/user-config.example.json");

// --- 5. Pack content & public assets into tar.gz ---
const packPaths = [
  "src/content/blog",
  "src/content/note",
  "src/content/project",
  "public/avatar.svg",
  "public/site-icon.svg",
  "public/figures",
].filter((p) => existsSync(resolve(ROOT, p)));

if (packPaths.length > 0) {
  await createTarball(
    {
      cwd: ROOT,
      file: "src/data/user-content.tar.gz",
      gzip: true,
      portable: true,
    },
    packPaths,
  );
  console.log("Written: src/data/user-content.tar.gz");
} else {
  console.log("No content paths found, skipping archive.");
}

console.log("\nExtract complete!");
