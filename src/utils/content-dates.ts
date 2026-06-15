import { parseContentLocalDateString } from "./content-time-zone.ts";

interface DateFallbacks {
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface DateFrontmatter {
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function toValidDate(value?: string | Date | null) {
  if (!value) return null;

  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  return (
    parseContentLocalDateString(value) ??
    (() => {
      const date = new Date(value);
      return isValidDate(date) ? date : null;
    })()
  );
}

export function resolveContentDates(
  frontmatter: DateFrontmatter | undefined,
  fallback: DateFallbacks,
) {
  return {
    createdAt: toValidDate(frontmatter?.createdAt) ?? fallback.createdAt,
    updatedAt: toValidDate(frontmatter?.updatedAt) ?? fallback.updatedAt,
  } satisfies DateFallbacks;
}
