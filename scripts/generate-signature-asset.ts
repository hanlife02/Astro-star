import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { site } from "../src/config/site.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "public", "signature.svg");

function normalizeSvgMarkup(input: string) {
  let value = input.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/^['"]/, "").replace(/['"]$/, "");
  }

  return value.replace(/\\"/g, '"').replace(/\\'/g, "'");
}

const profile = site.profile as { signatureSvg?: string };
const signatureSvg = normalizeSvgMarkup(profile.signatureSvg ?? "");

if (!signatureSvg.startsWith("<svg") || !signatureSvg.includes("</svg>")) {
  console.log("Skipped signature asset generation: signatureSvg is empty.");
  process.exit(0);
}

const output = `${signatureSvg}\n`;
mkdirSync(dirname(OUT_FILE), { recursive: true });

if (existsSync(OUT_FILE) && readFileSync(OUT_FILE, "utf8") === output) {
  console.log(`Signature asset is up to date: ${OUT_FILE}`);
} else {
  writeFileSync(OUT_FILE, output, "utf8");
  console.log(`Generated signature asset: ${OUT_FILE}`);
}
