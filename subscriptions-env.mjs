import { existsSync, readFileSync } from "node:fs";

const envFile = new URL(".env.subscriptions", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const repositorySettingsFile = new URL(
  ".env.subscriptions.json",
  import.meta.url,
);
if (existsSync(repositorySettingsFile)) {
  const settings = JSON.parse(readFileSync(repositorySettingsFile, "utf8"));
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith("SUBSCRIPTIONS_") && typeof value === "string") {
      process.env[key] = value;
    }
  }
}
