import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowSource = await readFile(
  new URL("../.github/workflows/deploy.yml", import.meta.url),
  "utf8",
);

function getStepSource(name) {
  const marker = `      - name: ${name}\n`;
  const start = workflowSource.indexOf(marker);
  assert.notEqual(start, -1, `expected the ${name} step to exist`);

  const nextStep = workflowSource.indexOf(
    "\n      - name:",
    start + marker.length,
  );
  return workflowSource.slice(start, nextStep === -1 ? undefined : nextStep);
}

test("CodeTime token is available while the homepage is prerendered", () => {
  const buildStep = getStepSource("Build");

  assert.match(
    buildStep,
    /^\s+CODETIME_TOKEN: \$\{\{ secrets\.CODETIME_TOKEN \}\}$/m,
    "the prerender build must receive CODETIME_TOKEN",
  );
});

test("CodeTime token remains available to runtime API routes", () => {
  const runtimeEnvStep = getStepSource("Deploy runtime env vars");

  assert.match(
    runtimeEnvStep,
    /^\s+echo "CODETIME_TOKEN=\$\{\{ secrets\.CODETIME_TOKEN \}\}"$/m,
    "the deployed server environment must receive CODETIME_TOKEN",
  );
});
