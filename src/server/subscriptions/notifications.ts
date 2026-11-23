import nodemailer from "nodemailer";
import { site } from "../../config/site";
import { getSubscriptionSettings, type Channel } from "./settings";
import type { Delivery, openSubscriptionStore } from "./store";

type Settings = ReturnType<typeof getSubscriptionSettings>;

interface Message {
  title: string;
  body: string;
  url: string;
  manageUrl?: string;
}

export function subscriptionLink(token: string) {
  const link = new URL("/", site.site.url);
  link.hash = `subscribe=${token}`;
  return link.href;
}

function subscriptionReceipt(channel: Channel, url: string): Message {
  const publicationNotice =
    channel === "bark"
      ? "Bark will notify you immediately when new articles are published."
      : "We’ll email you as soon as new articles are published.";
  return {
    title: "Successfully Subscribed",
    body: `Thank you for subscribing to ${site.site.name}. ${publicationNotice} If you no longer wish to receive new notifications, you can unsubscribe by clicking on the link below.`,
    url,
    manageUrl: channel === "email" ? url : undefined,
  };
}

export async function deliverQueuedMessage(
  settings: Settings,
  store: ReturnType<typeof openSubscriptionStore>,
  delivery: Delivery,
) {
  const subscriber = store.getSubscription(delivery.token);
  if (!subscriber) return;
  const manageUrl = subscriptionLink(subscriber.token);
  const message: Message =
    delivery.kind === "receipt"
      ? subscriptionReceipt(subscriber.channel, manageUrl)
      : {
          title: delivery.title.slice(0, 200),
          body: `New publication on ${site.site.name}`,
          url: delivery.url,
          manageUrl: subscriber.channel === "telegram" ? undefined : manageUrl,
        };
  try {
    await sendSubscriptionMessage(
      settings,
      subscriber.channel,
      subscriber.destination,
      message,
    );
  } catch {
    const willRetry = store.retryDelivery(delivery);
    console.warn(
      `Subscription delivery failed (${subscriber.channel}, ${delivery.kind} ${delivery.id})${willRetry ? ", will retry" : ", retry limit reached"}.`,
    );
    return;
  }
  store.completeDelivery(delivery);
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
      text: [
        body,
        url !== manageUrl && url,
        manageUrl && `Unsubscribe: ${manageUrl}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      headers: manageUrl ? { "List-Unsubscribe": `<${manageUrl}>` } : undefined,
    });
    return;
  }

  if (channel === "bark" && settings.bark) {
    const response = await postJson("https://api.day.app/push", {
      device_key: destination,
      icon: new URL(site.site.iconSrc.trim() || "/site-icon.svg", site.site.url)
        .href,
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
