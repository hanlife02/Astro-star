import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- 1. Import TS configs (requires --experimental-strip-types) ---
const { site } = await import("../src/config/site.ts");
const { aboutPage } = await import("../src/config/about.ts");
const { linksPage, friendLinks, lostLinks } = await import(
  "../src/config/links.ts"
);

// --- 2. Extract RSS language via regex ---
const rssContent = readFileSync(
  resolve(ROOT, "src/pages/rss.xml.ts"),
  "utf-8",
);
const langMatch = rssContent.match(/<language>([\w-]+)<\/language>/);
const rssLanguage = langMatch ? langMatch[1] : "zh-cn";

// --- 3. Build unified config object ---
const config = {
  site,
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
  "public/legacy/avatar",
  "public/legacy/file",
].filter((p) => existsSync(resolve(ROOT, p)));

if (packPaths.length > 0) {
  execSync(
    `tar -czf src/data/user-content.tar.gz ${packPaths.join(" ")}`,
    { cwd: ROOT, stdio: "inherit" },
  );
  console.log("Written: src/data/user-content.tar.gz");
} else {
  console.log("No content paths found, skipping archive.");
}

console.log("\nExtract complete!");
