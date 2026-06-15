import { socialLinks } from "../config/social";
import type { SocialLinkId, SocialLinkItem } from "../types/social";

const socialLinkMap = new Map<SocialLinkId, SocialLinkItem>(
  socialLinks.map((item) => [item.id, item]),
);

export function getSocialLinks(ids: readonly SocialLinkId[]) {
  return ids
    .map((id) => socialLinkMap.get(id))
    .filter((item): item is SocialLinkItem =>
      Boolean(item?.enabled && item.href.trim()),
    );
}

export function getEnabledSocialLinks() {
  return socialLinks.filter(
    (item) => item.enabled && Boolean(item.href.trim()),
  );
}

export function getSocialLink(id: SocialLinkId) {
  return getSocialLinks([id])[0];
}
