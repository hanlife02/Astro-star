import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

const envFile = new URL(".env.subscriptions", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const runSubscriptions = Boolean(
  process.env.SUBSCRIPTIONS_SMTP_HOST ||
  process.env.SUBSCRIPTIONS_TELEGRAM_BOT_TOKEN ||
  process.env.SUBSCRIPTIONS_BARK === "true",
);
const workerToken = runSubscriptions ? randomBytes(32).toString("hex") : "";
process.env.SUBSCRIPTIONS_WORKER_TOKEN = workerToken;
process.env.ASTRO_NODE_AUTOSTART = "disabled";

const localEntry = new URL("dist/server/entry.mjs", import.meta.url);
const deployedEntry = new URL("server/entry.mjs", import.meta.url);
const { startServer } = await import(
  (existsSync(localEntry) ? localEntry : deployedEntry).href
);
const { server, done } = startServer();
let timer;

if (runSubscriptions) {
  const host =
    { "0.0.0.0": "127.0.0.1", "::": "::1" }[server.host] ?? server.host;
  const hostname = host.includes(":") ? `[${host}]` : host;
  const scheme =
    process.env.SERVER_CERT_PATH && process.env.SERVER_KEY_PATH
      ? "https"
      : "http";
  const endpoint = `${scheme}://${hostname}:${server.port}/api/subscriptions/dispatch`;
  async function dispatch() {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-subscriptions-worker-token": workerToken },
        redirect: "error",
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok)
        console.warn(`Subscription worker returned HTTP ${response.status}.`);
    } catch {
      console.warn("Subscription worker could not reach the local server.");
    } finally {
      timer = setTimeout(dispatch, 60_000).unref();
    }
  }

  timer = setTimeout(dispatch, 1_000).unref();
}

try {
  await done;
} finally {
  clearTimeout(timer);
}
