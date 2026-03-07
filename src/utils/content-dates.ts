interface DateFallbacks {
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface DateFrontmatter {
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

function toValidDate(value?: string | Date | null) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveContentDates(frontmatter: DateFrontmatter | undefined, fallback: DateFallbacks) {
  return {
    createdAt: toValidDate(frontmatter?.createdAt) ?? fallback.createdAt,
    updatedAt: toValidDate(frontmatter?.updatedAt) ?? fallback.updatedAt,
  } satisfies DateFallbacks;
}
