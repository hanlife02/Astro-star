import { timingSafeEqual } from "node:crypto";

export type Channel = "email" | "telegram" | "bark";

export function getSubscriptionSettings() {
  const env = process.env;
  const smtpPort = Number(env.SUBSCRIPTIONS_SMTP_PORT || "587");
  const smtp =
    env.SUBSCRIPTIONS_SMTP_HOST &&
    env.SUBSCRIPTIONS_SMTP_FROM &&
    Number.isInteger(smtpPort) &&
    smtpPort > 0 &&
    smtpPort <= 65535 &&
    Boolean(env.SUBSCRIPTIONS_SMTP_USER) ===
      Boolean(env.SUBSCRIPTIONS_SMTP_PASSWORD)
      ? {
          host: env.SUBSCRIPTIONS_SMTP_HOST,
          from: env.SUBSCRIPTIONS_SMTP_FROM,
          port: smtpPort,
          user: env.SUBSCRIPTIONS_SMTP_USER,
          password: env.SUBSCRIPTIONS_SMTP_PASSWORD,
        }
      : undefined;
  const telegram =
    env.SUBSCRIPTIONS_TELEGRAM_BOT_TOKEN &&
    env.SUBSCRIPTIONS_TELEGRAM_BOT_USERNAME?.match(/^[a-z0-9_]{5,32}$/i) &&
    env.SUBSCRIPTIONS_TELEGRAM_WEBHOOK_SECRET
      ? {
          token: env.SUBSCRIPTIONS_TELEGRAM_BOT_TOKEN,
          username: env.SUBSCRIPTIONS_TELEGRAM_BOT_USERNAME,
          webhookSecret: env.SUBSCRIPTIONS_TELEGRAM_WEBHOOK_SECRET,
        }
      : undefined;
  return { smtp, telegram, bark: env.SUBSCRIPTIONS_BARK === "true" };
}

export function matchesSecret(
  value: string | null,
  secret: string | undefined,
) {
  if (!value || !secret) return false;
  const actual = Buffer.from(value);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
