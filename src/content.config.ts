import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const baseContentSchema = z
  .object({
    routeSlug: z.union([z.string(), z.number()]).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    type: z.string().optional(),
    archiveSlug: z.string().optional(),
    projectUrl: z.string().optional(),
    docUrl: z.string().optional(),
    avatar: z.string().optional(),
    legacySourceCollection: z.string().optional(),
    legacySourceId: z.string().optional(),
  })
  .passthrough();

const about = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/about" }),
  schema: baseContentSchema,
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: baseContentSchema,
});

const links = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/links" }),
  schema: baseContentSchema,
});

const note = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/note" }),
  schema: baseContentSchema,
});

const project = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/project" }),
  schema: baseContentSchema,
});

export const collections = {
  about,
  blog,
  links,
  note,
  project,
};
