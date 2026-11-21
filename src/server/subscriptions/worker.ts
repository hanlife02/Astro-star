import { getCollection } from "astro:content";
import { site } from "../../config/site";
import { resolveContentSlug } from "../../utils/content-slug";
import { resolveContentTitle } from "../../utils/content-title";
import { isPublishedContentEntry } from "../../utils/content-visibility";
import { sendSubscriptionMessage, subscriptionLink } from "./notifications";
import { getSubscriptionSettings, type Channel } from "./settings";
import { getSubscriptionStore, type PublishedPost } from "./store";

async function listPublishedPosts() {
  const sections = ["blog", "note", "project"] as const;
  const posts = await Promise.all(
    sections.map(async (section) => {
      const entries = await getCollection(section, isPublishedContentEntry);
      return entries.flatMap((entry): PublishedPost[] => {
        const slug = resolveContentSlug(entry.id, entry.data.routeSlug);
        if (!slug) return [];
        return [
          {
            id: `${section}/${entry.id}`,
            title: resolveContentTitle(entry.id, entry.data.title),
            url: new URL(`/${section}/${slug}/`, site.site.url).href,
          },
        ];
      });
    }),
  );
  return posts.flat();
}

export async function deliverPublications() {
  const settings = getSubscriptionSettings();
  const channels: Channel[] = [];
  if (settings.smtp) channels.push("email");
  if (settings.telegram) channels.push("telegram");
  if (settings.bark) channels.push("bark");
  if (!channels.length) return;

  const store = getSubscriptionStore();
  store.recordPublications(await listPublishedPosts());
  for (let index = 0; index < 25; index++) {
    const delivery = store.claimDelivery(channels);
    if (!delivery) break;
    const subscriber = store.getSubscription(delivery.token);
    if (!subscriber) continue;

    try {
      await sendSubscriptionMessage(
        settings,
        subscriber.channel,
        subscriber.destination,
        {
          title: delivery.title.slice(0, 200),
          body: `New publication on ${site.site.name}`,
          url: delivery.url,
          manageUrl:
            subscriber.channel === "telegram"
              ? undefined
              : subscriptionLink(subscriber.token),
        },
      );
    } catch {
      const willRetry = store.retryDelivery(delivery);
      console.warn(
        `Subscription delivery failed (${subscriber.channel}, job ${delivery.id})${willRetry ? ", will retry" : ", retry limit reached"}.`,
      );
      continue;
    }
    store.completeDelivery(delivery.id);
  }
}
