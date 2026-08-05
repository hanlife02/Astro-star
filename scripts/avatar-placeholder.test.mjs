import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { createAvatarPlaceholderDataUrl } from "../src/utils/avatar-placeholder.mjs";

const helperUrl = new URL(
  "../src/utils/avatar-placeholder.mjs",
  import.meta.url,
);

test("the avatar placeholder generator exists", async () => {
  await assert.doesNotReject(access(helperUrl));
});

test("the public root remains stable after Astro bundles the helper", async () => {
  const helperSource = await readFile(helperUrl, "utf8");

  assert.match(helperSource, /resolve\("public"\)/);
  assert.doesNotMatch(helperSource, /import\.meta\.url/);
});

test("local avatars become a 16px WebP data URL", async () => {
  const dataUrl = await createAvatarPlaceholderDataUrl("/avatar.svg?v=1");

  assert.match(dataUrl ?? "", /^data:image\/webp;base64,/);
  const encoded = dataUrl?.split(",", 2)[1] ?? "";
  const metadata = await sharp(Buffer.from(encoded, "base64")).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 16);
  assert.equal(metadata.height, 16);
});

test("unsupported avatar sources degrade without a placeholder", async () => {
  for (const source of [
    "https://example.com/avatar.webp",
    "//example.com/avatar.webp",
    "avatar.webp",
    "/missing-avatar.webp",
    "/..%2Fpackage.json",
    "/%E0%A4%A",
  ]) {
    assert.equal(await createAvatarPlaceholderDataUrl(source), undefined);
  }
});
