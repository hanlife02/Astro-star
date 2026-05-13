export const CONTENT_TIME_ZONE = "Asia/Shanghai";

const CONTENT_TIME_ZONE_OFFSET = "+08:00";

const contentDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  timeZone: CONTENT_TIME_ZONE,
  year: "numeric",
});

const contentDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
  second: "2-digit",
  timeZone: CONTENT_TIME_ZONE,
  year: "numeric",
});

const contentDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: CONTENT_TIME_ZONE,
  year: "numeric",
});

const contentDateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: CONTENT_TIME_ZONE,
  year: "numeric",
});

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function getDateParts(date: Date) {
  return Object.fromEntries(
    contentDatePartsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<"day" | "month" | "year", string>;
}

function getDateTimeParts(date: Date) {
  return Object.fromEntries(
    contentDateTimePartsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<"day" | "hour" | "minute" | "month" | "second" | "year", string>;
}

export function parseContentLocalDateString(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/,
  );

  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${CONTENT_TIME_ZONE_OFFSET}`,
  );

  return isValidDate(date) ? date : null;
}

export function formatContentDate(date: Date) {
  return contentDateFormatter.format(date);
}

export function formatContentDateTime(date: Date) {
  return contentDateTimeFormatter.format(date);
}

export function getContentDateKey(date: Date) {
  const { day, month, year } = getDateParts(date);
  return `${year}-${month}-${day}`;
}

export function getContentMonthDay(date: Date) {
  const { day, month } = getDateParts(date);
  return `${month}.${day}`;
}

export function getContentYear(date: Date) {
  return getDateParts(date).year;
}

export function toContentIsoString(date: Date) {
  const { day, hour, minute, month, second, year } = getDateTimeParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${CONTENT_TIME_ZONE_OFFSET}`;
}
