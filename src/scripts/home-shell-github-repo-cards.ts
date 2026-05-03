type GitHubRepositoryCardPayload = {
  description?: string;
  stars?: number;
  avatarUrl?: string;
};

type GitHubRepositoryCardCache = {
  description: string;
  stars: number;
  avatarUrl: string;
  cachedAt: number;
};

const GITHUB_REPO_CARD_CACHE_TTL = 1000 * 60 * 60 * 6;

function formatStars(stars: number) {
  if (!Number.isFinite(stars)) return "";

  return new Intl.NumberFormat("en-US", {
    notation: stars >= 1000 ? "compact" : "standard",
    maximumFractionDigits: stars >= 1000 && stars < 10000 ? 1 : 0,
  }).format(stars);
}

function getCachedRepository(cacheKey: string) {
  try {
    const cachedValue = window.localStorage.getItem(cacheKey);
    if (!cachedValue) return null;

    const cachedRepository = JSON.parse(cachedValue) as GitHubRepositoryCardCache;
    if (Date.now() - cachedRepository.cachedAt > GITHUB_REPO_CARD_CACHE_TTL) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    return cachedRepository;
  } catch {
    return null;
  }
}

function setCachedRepository(cacheKey: string, repository: GitHubRepositoryCardCache) {
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(repository));
  } catch {
    // Ignore storage failures; the card can still render with live data.
  }
}

function applyRepositoryData(card: HTMLElement, repository: GitHubRepositoryCardCache) {
  const description = card.querySelector("[data-github-repo-description]");
  const stars = card.querySelector("[data-github-repo-stars]");
  const starCount = card.querySelector("[data-github-repo-star-count]");
  const avatar = card.querySelector(".content-repo-card-avatar");

  if (description instanceof HTMLElement && repository.description) {
    description.textContent = repository.description;
  }

  if (stars instanceof HTMLElement) {
    const formattedStars = formatStars(repository.stars);

    if (formattedStars) {
      if (starCount instanceof HTMLElement) {
        starCount.textContent = formattedStars;
      } else {
        stars.append(formattedStars);
      }

      stars.hidden = false;
      stars.title = `${repository.stars.toLocaleString("en-US")} stars`;
    }
  }

  if (avatar instanceof HTMLImageElement && repository.avatarUrl) {
    avatar.src = repository.avatarUrl;
  }
}

async function hydrateRepositoryCard(card: HTMLElement) {
  if (card.dataset.githubRepoHydrated === "true") return;

  const owner = card.dataset.githubOwner;
  const repo = card.dataset.githubRepo;
  if (!owner || !repo) return;

  card.dataset.githubRepoHydrated = "true";

  const cacheKey = `github-repo-card:v3:${owner}/${repo}`;
  const cachedRepository = getCachedRepository(cacheKey);
  if (cachedRepository) {
    applyRepositoryData(card, cachedRepository);
    return;
  }

  try {
    const params = new URLSearchParams({ owner, repo });
    const response = await fetch(`/api/github-repo-card.json?${params.toString()}`);

    if (!response.ok) return;

    const data = (await response.json()) as GitHubRepositoryCardPayload;
    const repository = {
      description: typeof data.description === "string" ? data.description.trim() : "",
      stars: typeof data.stars === "number" ? data.stars : 0,
      avatarUrl:
        typeof data.avatarUrl === "string" && data.avatarUrl
          ? data.avatarUrl
          : `https://github.com/${owner}.png?size=96`,
      cachedAt: Date.now(),
    };

    setCachedRepository(cacheKey, repository);
    applyRepositoryData(card, repository);
  } catch {
    // Leave the static repo card in place if GitHub metadata is unavailable.
  }
}

export function initHomeShellGitHubRepoCards() {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-github-repo-card='true']"),
  );

  cards.forEach((card) => {
    void hydrateRepositoryCard(card);
  });
}
