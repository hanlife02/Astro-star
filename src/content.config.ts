import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
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

const projectSchema = z.object({
  routeSlug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  createdAt: z.string().min(1),
  type: z.literal("Project"),
  archiveSlug: z.literal("project"),
  projectUrl: z.string().min(1),
  docUrl: z.string().min(1).optional(),
  avatar: z.string().min(1),
  legacySourceCollection: z.literal("projects"),
  legacySourceId: z.string().min(1),
});

const commentSchema = z.object({
  id: z.string().min(1),
  refId: z.string().min(1),
  refType: z.string().min(1),
  routePath: z.string().min(1).nullable(),
  author: z.string().min(1),
  authorUrl: z.string().url().nullable(),
  text: z.string(),
  parentId: z.string().min(1).nullable(),
  childrenIds: z.array(z.string()),
  key: z.string().min(1).nullable(),
  createdAt: z.string().datetime().nullable(),
  location: z.string().min(1).nullable(),
  isPinned: z.boolean(),
  source: z.string().min(1).nullable(),
});

const about = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/about" }),
  schema: baseContentSchema,
});

const comments = defineCollection({
  loader: file("src/data/comments/legacy-comments.json"),
  schema: commentSchema,
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
  schema: projectSchema,
});

export const collections = {
  about,
  comments,
  blog,
  links,
  note,
  project,
};
