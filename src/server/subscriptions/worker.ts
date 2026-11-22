import { getCollection } from "astro:content";
import { site } from "../../config/site";
import { resolveContentSlug } from "../../utils/content-slug";
import { resolveContentTitle } from "../../utils/content-title";
import { isPublishedContentEntry } from "../../utils/content-visibility";
import { deliverQueuedMessage } from "./notifications";
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
    await deliverQueuedMessage(settings, store, delivery);
  }
}
