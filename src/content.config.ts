import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const baseContentSchema = z.looseObject({
  routeSlug: z.union([z.string(), z.number()]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  published: z.boolean().optional(),
  type: z.string().optional(),
});

const projectSchema = baseContentSchema.extend({
  projectUrl: z.string().optional(),
  docUrl: z.string().optional(),
});

const pageSchema = z.object({
  title: z.string().min(1),
  heading: z.string().optional(),
  description: z.string().optional(),
  background: z
    .enum(["home", "code-rain", "constellation", "content"])
    .optional(),
  tocTitle: z.string().optional(),
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

const page = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/page" }),
  schema: pageSchema,
});

export const collections = {
  blog,
  note,
  project,
  page,
};
