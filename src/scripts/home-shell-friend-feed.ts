type FriendFeedWindow = Window & {
  __homeShellFriendFeedCleanup?: () => void;
};

const ROOT_SELECTOR = "[data-friend-feed='true']";
const LIST_SELECTOR = "[data-friend-feed-list='true']";
const ITEM_SELECTOR = "[data-friend-feed-item='true']";
const MORE_SELECTOR = "[data-friend-feed-more='true']";
const LESS_SELECTOR = "[data-friend-feed-less='true']";
const LINK_SELECTOR = ".friend-feed-link";

function toPositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function syncFriendFeedList(list: HTMLElement) {
  const items = Array.from(list.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  const initialCount = toPositiveInteger(
    list.dataset.friendFeedInitialCount,
    5,
  );
  const visibleCount = Math.min(
    items.length,
    toPositiveInteger(list.dataset.friendFeedVisibleCount, initialCount),
  );
  const root = list.closest(ROOT_SELECTOR);
  const moreButton = root?.querySelector<HTMLButtonElement>(MORE_SELECTOR);
  const lessButton = root?.querySelector<HTMLButtonElement>(LESS_SELECTOR);

  list.dataset.friendFeedVisibleCount = String(visibleCount);

  items.forEach((item, index) => {
    const link = item.querySelector<HTMLAnchorElement>(LINK_SELECTOR);

    if (index < visibleCount) {
      delete item.dataset.friendFeedHidden;
      item.removeAttribute("aria-hidden");
      link?.removeAttribute("tabindex");
    } else {
      item.dataset.friendFeedHidden = "true";
      item.setAttribute("aria-hidden", "true");
      link?.setAttribute("tabindex", "-1");
    }
  });

  if (moreButton) {
    moreButton.hidden = visibleCount >= items.length;
  }

  if (lessButton) {
    lessButton.hidden = visibleCount <= initialCount;
  }
}

export function initHomeShellFriendFeed() {
  const browserWindow = window as FriendFeedWindow;
  browserWindow.__homeShellFriendFeedCleanup?.();

  const lists = Array.from(
    document.querySelectorAll<HTMLElement>(LIST_SELECTOR),
  );

  lists.forEach(syncFriendFeedList);

  const handleMoreClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const moreButton = target.closest<HTMLButtonElement>(MORE_SELECTOR);
    const lessButton = target.closest<HTMLButtonElement>(LESS_SELECTOR);
    const controlButton = moreButton ?? lessButton;
    if (!controlButton) return;

    const root = controlButton.closest(ROOT_SELECTOR);
    const list = root?.querySelector<HTMLElement>(LIST_SELECTOR);
    if (!list) return;

    const initialCount = toPositiveInteger(
      list.dataset.friendFeedInitialCount,
      5,
    );
    const currentVisibleCount = toPositiveInteger(
      list.dataset.friendFeedVisibleCount,
      initialCount,
    );
    const revealCount = toPositiveInteger(
      list.dataset.friendFeedRevealCount,
      5,
    );
    const nextVisibleCount = moreButton
      ? currentVisibleCount + revealCount
      : initialCount;

    list.dataset.friendFeedVisibleCount = String(nextVisibleCount);
    syncFriendFeedList(list);
  };

  document.addEventListener("click", handleMoreClick);

  browserWindow.__homeShellFriendFeedCleanup = () => {
    document.removeEventListener("click", handleMoreClick);
    browserWindow.__homeShellFriendFeedCleanup = undefined;
  };
}
