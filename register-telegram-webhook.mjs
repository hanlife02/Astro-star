#!/usr/bin/env node
import "./subscriptions-env.mjs";
import { callTelegram } from "./telegram-api.mjs";

async function register(domain) {
  const input = domain?.includes("://") ? domain : `https://${domain}`;
  const url = URL.parse(input);
  if (
    !domain ||
    process.argv.length !== 3 ||
    !url ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "用法：./register-telegram-webhook.mjs https://example.com",
    );
  }
  const token = process.env.SUBSCRIPTIONS_TELEGRAM_BOT_TOKEN;
  const secret = process.env.SUBSCRIPTIONS_TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret)
    throw new Error("请先配置 Telegram 的两个 Secret 并部署");

  url.pathname = "/api/subscriptions/telegram";
  await callTelegram(token, "setWebhook", {
    url: url.href,
    secret_token: secret,
    allowed_updates: ["message"],
    max_connections: 1,
  });
  console.log(`Telegram webhook 已注册：${url.href}`);
}

try {
  await register(process.argv[2]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
