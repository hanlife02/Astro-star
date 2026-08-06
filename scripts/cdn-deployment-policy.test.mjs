import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);

test("deployment does not include Cloudflare CDN integration", async () => {
  const [workflowSource, packageSource] = await Promise.all([
    readFile(new URL(".github/workflows/deploy.yml", repositoryRoot), "utf8"),
    readFile(new URL("package.json", repositoryRoot), "utf8"),
  ]);

  assert.doesNotMatch(workflowSource, /cloudflare/i);
  assert.doesNotMatch(packageSource, /cloudflare/i);
  await assert.rejects(
    access(new URL("scripts/cloudflare-cache-purge.mjs", repositoryRoot)),
    { code: "ENOENT" },
  );
});
