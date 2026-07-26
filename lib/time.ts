/** Small wrappers so `Date.now()` / `new Date()` aren't called directly inside component render bodies (flagged by react-hooks/purity). */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function now(): Date {
  return new Date();
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** UTC instants bounding "today" in Asia/Kolkata (IST has no DST, so a fixed offset is safe). */
export function istDayWindow(reference: Date = new Date()): { start: Date; end: Date } {
  const ist = new Date(reference.getTime() + IST_OFFSET_MS);
  const startMs =
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
  return { start: new Date(startMs), end: new Date(startMs + 24 * 60 * 60 * 1000) };
}

/**
 * Format a Date as an `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") in IST,
 * independent of the browser's timezone. Pairs with {@link parseIstDateTime} on submit so the
 * displayed wall-clock and the stored instant always agree, on any host. All events are IST.
 */
export function toIstDateTimeLocal(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Parse a datetime-local / date input value as an IST wall-clock time and return the matching
 * UTC instant. `new Date("2026-07-28T04:00")` parses in the *server's* timezone — correct on an
 * IST box, but +5:30 off on a UTC host like Vercel. This is timezone-independent.
 */
export function parseIstDateTime(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value);
  if (!m) return new Date(NaN);
  const [, y, mo, d, h, mi] = m;
  return new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0)) - IST_OFFSET_MS
  );
}

/** Time-of-day greeting based on the current hour in IST (all events are India-based). */
export function greetingForIST(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
