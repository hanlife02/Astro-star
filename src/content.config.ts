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

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
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
  blog,
  note,
  project,
};
