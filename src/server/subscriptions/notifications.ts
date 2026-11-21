import nodemailer from "nodemailer";
import { site } from "../../config/site";
import { getSubscriptionSettings, type Channel } from "./settings";

type Settings = ReturnType<typeof getSubscriptionSettings>;

interface Message {
  title: string;
  body: string;
  url: string;
  manageUrl?: string;
}

export function subscriptionLink(token: string) {
  const link = new URL("/subscribe/", site.site.url);
  link.searchParams.set("token", token);
  return link.href;
}

export async function sendSubscriptionMessage(
  settings: Settings,
  channel: Channel,
  destination: string,
  { title, body, url, manageUrl }: Message,
) {
  if (channel === "email" && settings.smtp) {
    const { host, port, user, password, from } = settings.smtp;
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: user ? { user, pass: password } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await transport.sendMail({
      from,
      to: { name: "", address: destination },
      subject: title,
      text: [body, url, manageUrl && `Unsubscribe: ${manageUrl}`]
        .filter(Boolean)
        .join("\n\n"),
      headers: manageUrl ? { "List-Unsubscribe": `<${manageUrl}>` } : undefined,
    });
    return;
  }

  if (channel === "bark" && settings.bark) {
    const response = await postJson("https://api.day.app/push", {
      device_key: destination,
      title,
      body: [body, manageUrl && `Unsubscribe: ${manageUrl}`]
        .filter(Boolean)
        .join("\n\n"),
      url,
      level: "passive",
    });
    if (response.code === 200) return;
  }

  if (channel === "telegram" && settings.telegram) {
    const response = await postJson(
      `https://api.telegram.org/bot${settings.telegram.token}/sendMessage`,
      {
        chat_id: destination,
        text: `${[title, body, url].filter(Boolean).join("\n\n")}\n\nSend /stop to unsubscribe.`,
        link_preview_options: { is_disabled: true },
      },
    );
    if (response.ok === true) return;
  }

  throw new Error("Subscription provider did not accept the message");
}

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`Provider returned HTTP ${response.status}`);
  return response.json();
}
