import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { site } from "../src/config/site";
import { POST } from "../src/pages/api/subscriptions/preferences";
import { POST as telegramWebhook } from "../src/pages/api/subscriptions/telegram";
import { openSubscriptionStore } from "../src/server/subscriptions/store";

const minute = 60_000;
const oldPost = {
  id: "blog/old",
  title: "Old post",
  url: "https://example.com/blog/old/",
};
const newPost = {
  id: "note/new",
  title: "New post",
  url: "https://example.com/note/new/",
};

function configure(t: TestContext, env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) {
    const before = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (before === undefined) delete process.env[key];
      else process.env[key] = before;
    });
  }
}

async function post(action: string, fields: Record<string, string>) {
  const request = new Request(
    "https://example.com/api/subscriptions/preferences",
    { method: "POST", body: new URLSearchParams({ action, ...fields }) },
  );
  return POST({ request } as Parameters<typeof POST>[0]);
}

test("only confirmed subscribers receive new publications after the baseline", (t) => {
  const store = openSubscriptionStore(":memory:");
  t.after(() => store.close());
  const email = store.requestConfirmation("email", "reader@example.com", 0)!;
  const bark = store.requestConfirmation("bark", "bark-device-key", 0)!;
  assert.equal(store.confirmSubscription(email.token, 1), true);
  store.updateTelegramSubscription("123", true, 1);

  store.recordPublications([oldPost], 2);
  const receipt = store.claimDelivery(["email", "bark", "telegram"], 2)!;
  assert.equal(receipt.kind, "receipt");
  assert.equal(receipt.token, email.token);
  store.completeDelivery(receipt);
  assert.equal(
    store.claimDelivery(["email", "bark", "telegram"], 2),
    undefined,
  );
  store.recordPublications([{ ...oldPost, title: "Edited title" }, newPost], 3);
  const emailJob = store.claimDelivery(["email"], 3)!;
  assert.equal(emailJob.kind, "publication");
  assert.equal(emailJob.token, email.token);
  assert.equal(emailJob.url, newPost.url);
  store.completeDelivery(emailJob);
  assert.equal(store.claimDelivery(["bark"], 3), undefined);

  assert.equal(store.confirmSubscription(bark.token, 4), true);
  store.completeDelivery(store.claimReceipt(bark.token, 4)!);
  store.updateTelegramSubscription("123", false, 4);
  store.recordPublications([oldPost, newPost], 5);
  assert.equal(
    store.claimDelivery(["email", "bark", "telegram"], 5),
    undefined,
  );
});

test("Bark and Email each get one success notice with a working unsubscribe link", async (t) => {
  configure(t, {
    SUBSCRIPTIONS_DB_PATH: ":memory:",
    SUBSCRIPTIONS_SMTP_HOST: "smtp.example.com",
    SUBSCRIPTIONS_SMTP_FROM: "test@example.com",
    SUBSCRIPTIONS_BARK: "true",
  });
  const emails: Mail.Options[] = [];
  // Keep the providers busy until both subscriptions have been confirmed in the UI.
  const providerReply = Promise.withResolvers<void>();
  t.after(() => providerReply.resolve());
  const pushes: {
    device_key: string;
    icon: string;
    title: string;
    body: string;
    url: string;
  }[] = [];
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail(message: Mail.Options) {
      emails.push(message);
      if (emails.length === 2) return providerReply.promise;
    },
  }));
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.day.app/push");
    pushes.push(JSON.parse(String(init.body)));
    if (pushes.length === 2) await providerReply.promise;
    return Response.json({ code: 200 });
  });
  for (const channel of ["email", "bark"] as const) {
    const destination =
      channel === "email" ? "reader@example.com" : "bark-device-key";
    assert.equal((await post(channel, { destination })).status, 200);
    const link =
      channel === "email"
        ? String(emails[0].text).split("\n\n").at(-1)!
        : pushes[0].url;
    const confirmation = `Open the link below within 24 hours to confirm your subscription to ${site.site.name} and receive notifications when new articles are published.`;
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get(
      "subscribe",
    )!;
    const repeat = {
      destination:
        channel === "email" ? " reader@EXAMPLE.COM " : ` ${destination} `,
    };
    const pending = await (await post(channel, repeat)).json();
    assert.match(pending.message, /Check/);
    assert.equal(pending.next, undefined);
    assert.equal(
      (await (await post("manage", { token })).json()).next,
      "confirm",
    );
    const confirmations = await Promise.all([
      post("confirm", { token }),
      post("confirm", { token }),
    ]);
    for (const response of confirmations)
      assert.equal((await response.json()).next, "unsubscribe");
    const duplicate = await (await post(channel, repeat)).json();
    assert.deepEqual(duplicate, {
      message:
        channel === "email"
          ? "This email address is already subscribed."
          : "This Bark device key is already subscribed.",
      next: "request-unsubscribe",
    });
    if (channel === "email") {
      assert.equal(emails.length, 2);
      assert.equal(emails[0].subject, "Confirm Subscription");
      assert.equal(emails[0].text, `${confirmation}\n\n${link}`);
      assert.deepEqual(emails[1].to, { name: "", address: destination });
      assert.equal(emails[1].subject, "Successfully Subscribed");
      assert.equal(
        emails[1].text,
        `Thank you for subscribing to ${site.site.name}. We’ll email you as soon as new articles are published. If you no longer wish to receive new notifications, you can unsubscribe by clicking on the link below.\n\nUnsubscribe: ${link}`,
      );
      assert.deepEqual(emails[1].headers, { "List-Unsubscribe": `<${link}>` });
    } else {
      assert.equal(pushes.length, 2);
      assert.equal(pushes[0].title, "Confirm Subscription");
      assert.equal(pushes[0].body, confirmation);
      const icon = new URL(
        site.site.iconSrc.trim() || "/site-icon.svg",
        site.site.url,
      ).href;
      for (const push of pushes) assert.equal(push.icon, icon);
      assert.equal(pushes[1].device_key, destination);
      assert.equal(pushes[1].title, "Successfully Subscribed");
      assert.equal(
        pushes[1].body,
        `Thank you for subscribing to ${site.site.name}. Bark will notify you immediately when new articles are published. If you no longer wish to receive new notifications, you can unsubscribe by clicking on the link below.`,
      );
      assert.equal(pushes[1].url, link);
      assert.equal(JSON.stringify(pushes[1]).split(link).length - 1, 1);
    }
    const recovery = { ...repeat, intent: "unsubscribe" };
    const replies = await Promise.all([
      post(channel, recovery),
      post(channel, recovery),
    ]);
    const messages = await Promise.all(
      replies.map((response) => response.text()),
    );
    assert.ok(
      messages.some((message) => message.includes("for your unsubscribe link")),
    );
    assert.ok(
      messages.some((message) => message.includes("request another later")),
    );
    assert.ok(messages.every((message) => !message.includes(token)));
    if (channel === "email") {
      assert.equal(emails.length, 3);
      assert.deepEqual(emails[2].to, { name: "", address: destination });
      assert.equal(emails[2].subject, "Unsubscribe");
      assert.ok(String(emails[2].text).endsWith(link));
    } else {
      assert.equal(pushes.length, 3);
      assert.equal(pushes[2].device_key, destination);
      assert.equal(pushes[2].url, link);
      assert.equal(pushes[2].title, "Unsubscribe");
    }
    assert.equal(
      (await (await post("manage", { token })).json()).next,
      "unsubscribe",
    );
    assert.equal((await post("unsubscribe", { token })).status, 200);
    assert.equal((await post("confirm", { token })).status, 410);
    assert.match(
      (await (await post(channel, recovery)).json()).message,
      /no active subscription/,
    );
  }
});

test("repeated Telegram starts share a private unsubscribe link and allow a fresh subscription after opting out", async (t) => {
  configure(t, {
    SUBSCRIPTIONS_DB_PATH: ":memory:",
    SUBSCRIPTIONS_TELEGRAM_BOT_USERNAME: "example_bot",
    SUBSCRIPTIONS_TELEGRAM_BOT_TOKEN: "test-token",
    SUBSCRIPTIONS_TELEGRAM_WEBHOOK_SECRET: "test-secret",
  });
  async function command(text: string) {
    const request = new Request(
      "https://example.com/api/subscriptions/telegram",
      {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "test-secret" },
        body: JSON.stringify({
          message: { text, chat: { type: "private", id: 4242 } },
        }),
      },
    );
    return (
      await telegramWebhook({ request } as Parameters<
        typeof telegramWebhook
      >[0])
    ).json();
  }
  const first = await command("/start subscribe");
  assert.equal(
    first.text,
    `You’re subscribed to ${site.site.name}. Send /stop to unsubscribe.`,
  );
  const duplicate = await command("/start");
  assert.deepEqual(await command("/start subscribe"), duplicate);
  assert.equal(
    duplicate.text,
    `This Telegram account is already subscribed to ${site.site.name}.`,
  );
  assert.equal(duplicate.chat_id, 4242);
  const button = duplicate.reply_markup.inline_keyboard[0][0];
  assert.equal(button.text, "Unsubscribe");
  const url = new URL(button.url);
  assert.equal(url.origin, new URL(site.site.url).origin);
  const token = new URLSearchParams(url.hash.slice(1)).get("subscribe")!;
  assert.equal(
    (await (await post("manage", { token })).json()).next,
    "unsubscribe",
  );
  assert.equal((await post("unsubscribe", { token })).status, 200);
  assert.deepEqual(await command("/start"), first);
  assert.equal((await post("manage", { token })).status, 410);
  assert.match((await command("/stop")).text, /unsubscribed/);
  assert.deepEqual(await command("/start"), first);
});

test("a failed receipt survives restart and is dropped if the reader unsubscribes", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "astro-star-receipts-"));
  const filename = join(directory, "subscriptions.sqlite");
  const first = openSubscriptionStore(filename);
  const { token } = first.requestConfirmation("bark", "bark-device-key", 0)!;
  assert.ok(first.confirmSubscription(token, 1));
  const receipt = first.claimReceipt(token, 1)!;
  assert.equal(first.claimDelivery(["bark"], 1), undefined);
  assert.ok(first.retryDelivery(receipt, 1));
  first.close();
  const reopened = openSubscriptionStore(filename);
  t.after(() => {
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  });
  assert.equal(reopened.claimDelivery(["bark"], 2 * minute), undefined);
  const retry = reopened.claimDelivery(["bark"], 2 * minute + 1)!;
  assert.equal(retry.kind, "receipt");
  assert.equal(retry.attempts, 1);
  assert.ok(reopened.unsubscribe(token));
  assert.equal(reopened.claimDelivery(["bark"], 8 * minute), undefined);
});

test("confirmation links expire and reissuing a link replaces the pending token", (t) => {
  const store = openSubscriptionStore(":memory:");
  t.after(() => store.close());
  const initial = store.requestConfirmation("email", "reader@example.com", 0)!;
  assert.equal(
    store.requestConfirmation("email", "reader@example.com", minute),
    undefined,
  );
  const replacement = store.requestConfirmation(
    "email",
    "reader@example.com",
    15 * minute,
  )!;
  assert.notEqual(replacement.token, initial.token);
  assert.equal(store.getSubscription(initial.token, 15 * minute), undefined);
  assert.equal(
    store.getSubscription(replacement.token, 15 * minute)?.confirmed_at,
    null,
  );
  assert.equal(
    store.getSubscription(replacement.token, (24 * 60 + 15) * minute),
    undefined,
  );
  assert.equal(
    store.confirmSubscription(initial.token, 15 * minute + 1),
    false,
  );
  assert.equal(
    store.confirmSubscription(replacement.token, (24 * 60 + 15) * minute),
    false,
  );
});

test("delivery leases and retries survive restarts and unpublished entries drop from the queue", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "astro-star-subscriptions-"));
  const filename = join(directory, "subscriptions.sqlite");
  const first = openSubscriptionStore(filename);
  const second = openSubscriptionStore(filename);
  t.after(() => {
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  first.updateTelegramSubscription("123", true, 0);
  first.recordPublications([oldPost], 0);
  first.recordPublications([oldPost, newPost], 1);
  const job = first.claimDelivery(["telegram"], 1)!;
  assert.equal(second.claimDelivery(["telegram"], 1), undefined);
  first.close();

  const retry = second.claimDelivery(["telegram"], 5 * minute + 1)!;
  assert.equal(retry.id, job.id);
  assert.equal(second.retryDelivery(retry, 6 * minute), true);
  assert.equal(second.claimDelivery(["telegram"], 8 * minute - 1), undefined);
  const next = second.claimDelivery(["telegram"], 8 * minute)!;
  assert.equal(next.attempts, 1);
  second.recordPublications([oldPost], 9 * minute);
  assert.equal(second.claimDelivery(["telegram"], 20 * minute), undefined);
});
