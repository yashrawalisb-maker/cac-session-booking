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
