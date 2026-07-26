import { createRequire } from "node:module";

type GithubSlugFn = (value: string, maintainCase?: boolean) => string;

const requireFromProject = createRequire(import.meta.url);
const requireFromAstro = createRequire(
  requireFromProject.resolve("astro/package.json"),
);
const { slug: githubSlug } = requireFromAstro("github-slugger") as {
  slug: GithubSlugFn;
};

/**
 * Replicates the entry id produced by Astro's glob loader
 * (astro/dist/content/loaders/glob.js generateIdDefault): frontmatter `slug`
 * wins, otherwise every path segment is github-slugged and a trailing
 * `/index` is dropped. Node-only: do not import from client code.
 */
export function getLoaderEntryId(
  relativeEntryPath: string,
  frontmatterSlug?: unknown,
) {
  if (frontmatterSlug) return String(frontmatterSlug);

  const withoutFileExt = relativeEntryPath.replace(/\.[^/.]+$/, "");
  return withoutFileExt
    .split("/")
    .map((segment) => githubSlug(segment))
    .join("/")
    .replace(/\/index$/, "");
}
