const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const envFile = resolve(__dirname, ".env");
const env = {};
try {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0 && !line.startsWith("#")) {
      env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
} catch {}

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "Blog",
      script: "server/entry.mjs",
      env: {
        PORT: process.env.PORT || env.PORT || 4321,
        ...env,
      },
    },
  ],
};
