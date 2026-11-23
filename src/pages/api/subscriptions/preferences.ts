import type { APIRoute } from "astro";
import { site } from "../../../config/site";
import {
  deliverQueuedMessage,
  sendSubscriptionMessage,
  subscriptionLink,
} from "../../../server/subscriptions/notifications";
import { readSubscriptionBody } from "../../../server/subscriptions/request";
import { getSubscriptionSettings } from "../../../server/subscriptions/settings";
import { getSubscriptionStore } from "../../../server/subscriptions/store";

function reply(data: object, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export const GET: APIRoute = () => {
  const { smtp, bark, telegram } = getSubscriptionSettings();
  return reply({
    email: Boolean(smtp),
    bark,
    telegram: telegram?.username ?? null,
  });
};

export const POST: APIRoute = async ({ request }) => {
  if (
    request.headers.get("content-type")?.split(";")[0] !==
    "application/x-www-form-urlencoded"
  ) {
    return reply({ message: "Unsupported content type." }, 415);
  }
  const body = await readSubscriptionBody(request, 4096);
  if (!body) return reply({ message: "Invalid request." }, 400);
  const form = new URLSearchParams(body);
  const action = form.get("action");

  if (action === "manage" || action === "confirm" || action === "unsubscribe") {
    const store = getSubscriptionStore();
    const token = form.get("token") ?? "";
    const subscription = store.getSubscription(token);
    const invalid = "This subscription link is invalid or has expired.";
    if (!subscription) return reply({ message: invalid }, 410);
    if (action === "unsubscribe") {
      if (!store.unsubscribe(token)) return reply({ message: invalid }, 410);
      return reply({ message: "You’re unsubscribed." });
    }
    if (action === "confirm" && subscription.confirmed_at == null) {
      if (store.confirmSubscription(token)) {
        const receipt = store.claimReceipt(token);
        if (receipt) {
          // The durable queue also covers a restart while the provider is responding.
          void deliverQueuedMessage(
            getSubscriptionSettings(),
            store,
            receipt,
          ).catch(() =>
            console.warn(
              "Could not finish processing the subscription receipt.",
            ),
          );
        }
      } else if (store.getSubscription(token)?.confirmed_at == null) {
        return reply({ message: invalid }, 410);
      }
    }
    if (subscription.confirmed_at != null || action === "confirm") {
      return reply({
        message: "Your subscription is active.",
        next: "unsubscribe",
      });
    }
    return reply({
      message: "Confirm to receive new publications.",
      next: "confirm",
    });
  }

  if (action !== "email" && action !== "bark")
    return reply({ message: "Unknown action." }, 400);
  const settings = getSubscriptionSettings();
  if (!(action === "email" ? settings.smtp : settings.bark)) {
    return reply({ message: "This channel is unavailable." }, 503);
  }
  const destination = form.get("destination")?.trim() ?? "";
  const valid =
    action === "email"
      ? destination.length <= 254 &&
        /^[^\s@<>,;():"\\]+@(?:[a-z0-9-]+\.)+[a-z0-9-]+$/i.test(destination)
      : /^[a-z0-9_-]{10,128}$/i.test(destination);
  if (!valid) {
    return reply(
      {
        message:
          action === "email"
            ? "Enter a valid email address."
            : "Enter a valid Bark device key.",
      },
      400,
    );
  }
  const address =
    action === "email"
      ? destination.replace(
          /@([^@]+)$/,
          (_, domain: string) => `@${domain.toLowerCase()}`,
        )
      : destination;
  const store = getSubscriptionStore();
  const target =
    action === "email" ? "This email address" : "This Bark device key";
  if (form.get("intent") === "unsubscribe") {
    const link = store.requestUnsubscribeLink(action, address);
    if (link.status === "inactive")
      return reply({ message: `${target} has no active subscription.` });
    const inbox = action === "email" ? "your email" : "Bark";
    if (link.status === "limited")
      return reply({
        message: `Use the subscription link already in ${inbox}, or request another later.`,
      });
    const url = subscriptionLink(link.token);
    try {
      await sendSubscriptionMessage(settings, action, address, {
        title: "Unsubscribe",
        body: `Open the link below to unsubscribe from ${site.site.name}.`,
        url,
        manageUrl: action === "email" ? url : undefined,
      });
    } catch {
      return reply(
        {
          message: `We couldn’t send the link. You can also use a previous subscription link in ${inbox}.`,
        },
        503,
      );
    }
    return reply({ message: `Check ${inbox} for your unsubscribe link.` });
  }

  const pending = store.requestConfirmation(action, address);
  if (pending?.confirmed)
    return reply({
      message: `${target} is already subscribed.`,
      next: "request-unsubscribe",
    });
  if (pending) {
    try {
      await sendSubscriptionMessage(settings, action, address, {
        title: "Confirm Subscription",
        body: `Open the link below within 24 hours to confirm your subscription to ${site.site.name} and receive notifications when new articles are published.`,
        url: subscriptionLink(pending.token),
      });
    } catch {
      console.warn(`Subscription confirmation could not be sent (${action}).`);
    }
  }
  return reply({
    message:
      action === "email"
        ? "Check your email for a subscription link."
        : "Check Bark for a subscription notification.",
  });
};
