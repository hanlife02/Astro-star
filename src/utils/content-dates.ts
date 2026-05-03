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

function parseLocalDateString(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/,
  );

  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return isValidDate(date) ? date : null;
}

function toValidDate(value?: string | Date | null) {
  if (!value) return null;

  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  return (
    parseLocalDateString(value) ??
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
