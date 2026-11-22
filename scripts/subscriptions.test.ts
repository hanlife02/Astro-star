import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
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

test("only confirmed subscribers receive new publications after the baseline", (t) => {
  const store = openSubscriptionStore(":memory:");
  t.after(() => store.close());
  const email = store.requestConfirmation("email", "reader@example.com", 0)!;
  const bark = store.requestConfirmation("bark", "bark-device-key", 0)!;
  assert.equal(store.confirmSubscription(email.token, 1), true);
  store.updateTelegramSubscription("123", true, 1);

  store.recordPublications([oldPost], 2);
  assert.equal(
    store.claimDelivery(["email", "bark", "telegram"], 2),
    undefined,
  );
  store.recordPublications([{ ...oldPost, title: "Edited title" }, newPost], 3);
  const emailJob = store.claimDelivery(["email"], 3)!;
  assert.equal(emailJob.token, email.token);
  assert.equal(emailJob.url, newPost.url);
  store.completeDelivery(emailJob.id);
  assert.equal(store.claimDelivery(["bark"], 3), undefined);

  assert.equal(store.confirmSubscription(bark.token, 4), true);
  store.updateTelegramSubscription("123", false, 4);
  store.recordPublications([oldPost, newPost], 5);
  assert.equal(
    store.claimDelivery(["email", "bark", "telegram"], 5),
    undefined,
  );
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
