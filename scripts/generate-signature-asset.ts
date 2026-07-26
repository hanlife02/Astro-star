import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { site } from "../src/config/site.ts";
import {
  SIGNATURE_ASSET_BASENAME,
  isValidSignatureSvgMarkup,
  normalizeSignatureSvgMarkup,
} from "../src/utils/signature-svg.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "public", SIGNATURE_ASSET_BASENAME);

const profile = site.profile as { signatureSvg?: string };
const signatureSvg = normalizeSignatureSvgMarkup(profile.signatureSvg ?? "");

if (!isValidSignatureSvgMarkup(signatureSvg)) {
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
