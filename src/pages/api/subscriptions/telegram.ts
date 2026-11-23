import type { APIRoute } from "astro";
import { site } from "../../../config/site";
import { subscriptionLink } from "../../../server/subscriptions/notifications";
import { readSubscriptionBody } from "../../../server/subscriptions/request";
import {
  getSubscriptionSettings,
  matchesSecret,
} from "../../../server/subscriptions/settings";
import { getSubscriptionStore } from "../../../server/subscriptions/store";

interface TelegramUpdate {
  message?: { text?: string; chat?: { id: number; type: string } };
}

export const POST: APIRoute = async ({ request }) => {
  const { telegram } = getSubscriptionSettings();
  const headers = { "cache-control": "no-store" };
  if (
    !matchesSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
      telegram?.webhookSecret,
    )
  ) {
    return new Response(null, { status: 404, headers });
  }

  let update: TelegramUpdate | null;
  try {
    const body = await readSubscriptionBody(request, 32_768);
    if (!body) return new Response(null, { status: 400, headers });
    update = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400, headers });
  }

  const chat = update?.message?.chat;
  const text = update?.message?.text;
  if (
    chat?.type !== "private" ||
    !Number.isSafeInteger(chat.id) ||
    typeof text !== "string"
  ) {
    return new Response(null, { status: 204, headers });
  }

  const command = text.trim();
  if (
    command !== "/start" &&
    command !== "/start subscribe" &&
    command !== "/stop"
  ) {
    return new Response(null, { status: 204, headers });
  }
  const subscribe = command !== "/stop";
  const result = getSubscriptionStore().updateTelegramSubscription(
    String(chat.id),
    subscribe,
  );
  if (result?.alreadySubscribed) {
    return Response.json(
      {
        method: "sendMessage",
        chat_id: chat.id,
        text: `This Telegram account is already subscribed to ${site.site.name}.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Unsubscribe", url: subscriptionLink(result.token) }],
          ],
        },
      },
      { headers },
    );
  }
  return Response.json(
    {
      method: "sendMessage",
      chat_id: chat.id,
      text: subscribe
        ? `You’re subscribed to ${site.site.name}. Send /stop to unsubscribe.`
        : `You’re unsubscribed from ${site.site.name}. Send /start to subscribe again.`,
    },
    { headers },
  );
};
