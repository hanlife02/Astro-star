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

// --- 1. Import TS configs ---
const { site } = await import("../src/config/site.ts");
const { linkApplyOwner, friendLinks, lostLinks } =
  await import("../src/config/links.ts");
const { socialLinks, socialDisplay } = await import("../src/config/social.ts");
const { algoliaSiteSearchConfig, algoliaCrawlerVerification } =
  await import("../src/config/search.ts");

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
    articleActions: normalizeArticleActions(input?.articleActions),
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
  links: {
    applyOwner: linkApplyOwner,
    friendLinks,
    lostLinks,
  },
  social: {
    socialLinks,
    socialDisplay,
  },
  search: {
    algoliaSiteSearchConfig,
    algoliaCrawlerVerification,
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
  "src/content/page",
  "src/content/blog",
  "src/content/note",
  "src/content/project",
  "public/avatar.svg",
  "public/site-icon.svg",
  "public/figures",
  "public/reward",
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
