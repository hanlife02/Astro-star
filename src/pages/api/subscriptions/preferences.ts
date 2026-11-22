import type { APIRoute } from "astro";
import { site } from "../../../config/site";
import {
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
    if (
      action === "confirm" &&
      subscription.confirmed_at == null &&
      !store.confirmSubscription(token)
    ) {
      return reply({ message: invalid }, 410);
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
  const pending = getSubscriptionStore().requestConfirmation(action, address);
  if (pending) {
    try {
      await sendSubscriptionMessage(settings, action, address, {
        title: pending.confirmed
          ? `Manage your ${site.site.name} subscription`
          : `Confirm your ${site.site.name} subscription`,
        body: pending.confirmed
          ? "Open the link to manage your subscription."
          : "Open the link and confirm within 24 hours to receive new publication notifications.",
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
