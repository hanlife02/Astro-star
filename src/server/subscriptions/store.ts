import { randomBytes } from "node:crypto";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Channel } from "./settings";

interface Subscription {
  token: string;
  channel: Channel;
  destination: string;
  confirmed_at: number | null;
  requested_at: number;
}

export interface PublishedPost {
  id: string;
  title: string;
  url: string;
}

interface QueuedDelivery {
  id: number;
  token: string;
  attempts: number;
}

const queues = {
  publication: "deliveries",
  receipt: "subscription_receipts",
} as const;
export type Delivery = QueuedDelivery &
  ({ kind: "publication"; title: string; url: string } | { kind: "receipt" });

const minute = 60_000;
const linkCooldown = 15 * minute;
const confirmationLifetime = 24 * 60 * minute;
const isToken = (token: string) => /^[a-zA-Z0-9_-]{43}$/.test(token);
const newToken = () => randomBytes(32).toString("base64url");

export function openSubscriptionStore(path: string) {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    closeSync(openSync(path, "a", 0o600));
  }
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS subscriptions (
      token TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      destination TEXT NOT NULL,
      confirmed_at INTEGER,
      requested_at INTEGER NOT NULL,
      UNIQUE (channel, destination)
    );
    CREATE TABLE IF NOT EXISTS opt_in_requests (requested_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS unsubscribe_link_requests (
      token TEXT PRIMARY KEY REFERENCES subscriptions (token) ON DELETE CASCADE,
      requested_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS publication_baseline (id INTEGER PRIMARY KEY CHECK (id = 1));
    CREATE TABLE IF NOT EXISTS publications (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publication_id TEXT NOT NULL REFERENCES publications (id),
      token TEXT NOT NULL REFERENCES subscriptions (token) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      due_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      UNIQUE (publication_id, token)
    );
    CREATE INDEX IF NOT EXISTS deliveries_due ON deliveries (due_at);
    CREATE INDEX IF NOT EXISTS deliveries_subscriber ON deliveries (token);
    CREATE TABLE IF NOT EXISTS subscription_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE REFERENCES subscriptions (token) ON DELETE CASCADE,
      due_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
  `);

  function transaction<T>(run: () => T): T {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = run();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function getSubscription(token: string, now = Date.now()) {
    if (!isToken(token)) return undefined;
    return db
      .prepare(
        "SELECT * FROM subscriptions WHERE token = ? AND (confirmed_at IS NOT NULL OR requested_at > ?)",
      )
      .get(token, now - confirmationLifetime) as Subscription | undefined;
  }

  function findSubscription(channel: Channel, destination: string) {
    return db
      .prepare(
        "SELECT * FROM subscriptions WHERE channel = ? AND destination = ?",
      )
      .get(channel, destination) as Subscription | undefined;
  }

  function reserveLinkRequest(now: number) {
    db.prepare("DELETE FROM opt_in_requests WHERE requested_at <= ?").run(
      now - 60 * minute,
    );
    const count = db
      .prepare("SELECT count(*) AS total FROM opt_in_requests")
      .get()!;
    if (Number(count.total) >= 50) return false;
    db.prepare("INSERT INTO opt_in_requests VALUES (?)").run(now);
    return true;
  }

  function claim(
    kind: Delivery["kind"],
    channels: Channel[],
    now: number,
    token: string | null = null,
  ) {
    const queue = queues[kind];
    return db
      .prepare(
        `
      UPDATE ${queue} SET due_at = ?
      WHERE id = (
        SELECT ${queue}.id FROM ${queue} JOIN subscriptions USING (token)
        WHERE due_at <= ? AND channel IN (SELECT value FROM json_each(?))
        AND (? IS NULL OR token = ?)
        ORDER BY due_at, ${queue}.id LIMIT 1
      )
      RETURNING id, token, attempts, '${kind}' AS kind${kind === "publication" ? ", title, url" : ""}
    `,
      )
      .get(now + 5 * minute, now, JSON.stringify(channels), token, token) as
      | Delivery
      | undefined;
  }

  function completeDelivery(delivery: Delivery) {
    db.prepare(`DELETE FROM ${queues[delivery.kind]} WHERE id = ?`).run(
      delivery.id,
    );
  }

  return {
    close: () => db.close(),
    getSubscription,
    requestConfirmation(
      channel: "email" | "bark",
      destination: string,
      now = Date.now(),
    ) {
      return transaction(() => {
        const existing = findSubscription(channel, destination);
        if (existing?.confirmed_at != null)
          return { token: existing.token, confirmed: true };
        if (existing && now - existing.requested_at < linkCooldown) return;
        if (!reserveLinkRequest(now)) return;

        const token = newToken();
        db.prepare(
          `
          INSERT INTO subscriptions (token, channel, destination, requested_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (channel, destination) DO UPDATE
          SET token = excluded.token, requested_at = excluded.requested_at
        `,
        ).run(token, channel, destination, now);
        return { token, confirmed: false };
      });
    },
    requestUnsubscribeLink(
      channel: "email" | "bark",
      destination: string,
      now = Date.now(),
    ) {
      return transaction(() => {
        const existing = findSubscription(channel, destination);
        if (existing?.confirmed_at == null)
          return { status: "inactive" } as const;
        const recent = db
          .prepare(
            "SELECT 1 FROM unsubscribe_link_requests WHERE token = ? AND requested_at > ?",
          )
          .get(existing.token, now - linkCooldown);
        if (recent || !reserveLinkRequest(now))
          return { status: "limited" } as const;
        db.prepare(
          "INSERT OR REPLACE INTO unsubscribe_link_requests (token, requested_at) VALUES (?, ?)",
        ).run(existing.token, now);
        return { status: "ready", token: existing.token } as const;
      });
    },
    confirmSubscription(token: string, now = Date.now()) {
      if (!isToken(token)) return false;
      return transaction(() => {
        const updated = db
          .prepare(
            `
          UPDATE subscriptions SET confirmed_at = ?
          WHERE token = ? AND channel IN ('email', 'bark') AND confirmed_at IS NULL AND requested_at > ?
        `,
          )
          .run(now, token, now - confirmationLifetime);
        if (!updated.changes) return false;
        db.prepare(
          "INSERT INTO subscription_receipts (token, due_at) VALUES (?, ?)",
        ).run(token, now);
        return true;
      });
    },
    unsubscribe(token: string) {
      if (!isToken(token)) return false;
      return (
        db
          .prepare(
            "DELETE FROM subscriptions WHERE token = ? AND confirmed_at IS NOT NULL",
          )
          .run(token).changes === 1
      );
    },
    updateTelegramSubscription(
      destination: string,
      subscribe: boolean,
      now = Date.now(),
    ) {
      if (subscribe) {
        return transaction(() => {
          const existing = findSubscription("telegram", destination);
          if (existing)
            return { alreadySubscribed: true, token: existing.token } as const;
          db.prepare(
            `INSERT INTO subscriptions (token, channel, destination, requested_at, confirmed_at)
             VALUES (?, 'telegram', ?, ?, ?)`,
          ).run(newToken(), destination, now, now);
          return { alreadySubscribed: false } as const;
        });
      }
      db.prepare(
        "DELETE FROM subscriptions WHERE channel = 'telegram' AND destination = ?",
      ).run(destination);
    },
    recordPublications(posts: PublishedPost[], now = Date.now()) {
      transaction(() => {
        const isBaseline =
          db
            .prepare("INSERT OR IGNORE INTO publication_baseline VALUES (1)")
            .run().changes === 1;
        db.prepare(
          "DELETE FROM subscriptions WHERE confirmed_at IS NULL AND requested_at <= ?",
        ).run(now - confirmationLifetime);
        db.prepare(
          `
          DELETE FROM deliveries
          WHERE publication_id NOT IN (SELECT value FROM json_each(?))
        `,
        ).run(JSON.stringify(posts.map((post) => post.id)));

        const insert = db.prepare(
          "INSERT OR IGNORE INTO publications VALUES (?)",
        );
        const enqueue = db.prepare(`
          INSERT INTO deliveries (publication_id, token, title, url, due_at)
          SELECT ?, token, ?, ?, ? FROM subscriptions WHERE confirmed_at IS NOT NULL
        `);
        for (const post of posts) {
          const isNew = insert.run(post.id).changes === 1;
          if (isNew && !isBaseline)
            enqueue.run(post.id, post.title, post.url, now);
        }
      });
    },
    claimDelivery(channels: Channel[], now = Date.now()) {
      return (
        claim("receipt", channels, now) ?? claim("publication", channels, now)
      );
    },
    claimReceipt(token: string, now = Date.now()) {
      return claim("receipt", ["email", "bark"], now, token);
    },
    completeDelivery,
    retryDelivery(delivery: Delivery, now = Date.now()) {
      const attempts = delivery.attempts + 1;
      if (attempts >= 5) {
        completeDelivery(delivery);
        return false;
      }
      db.prepare(
        `UPDATE ${queues[delivery.kind]} SET attempts = ?, due_at = ? WHERE id = ?`,
      ).run(attempts, now + 2 ** attempts * minute, delivery.id);
      return true;
    },
  };
}

let store: ReturnType<typeof openSubscriptionStore> | undefined;

export function getSubscriptionStore() {
  return (store ??= openSubscriptionStore(
    process.env.SUBSCRIPTIONS_DB_PATH || ".subscriptions/subscriptions.sqlite",
  ));
}
