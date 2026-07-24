function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ. */
function toIcsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escape reserved characters in TEXT values (RFC 5545 §3.3.11). */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold long content lines at 75 octets, continuation lines start with a space (RFC 5545 §3.1). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

export function buildSessionIcs(params: {
  uid: string;
  title: string;
  description?: string | null;
  location: string;
  startsAt: Date;
  endsAt: Date;
}): string {
  const { uid, title, description, location, startsAt, endsAt } = params;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CAC//One Club Conclave 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(startsAt)}`,
    `DTEND:${toIcsUtc(endsAt)}`,
    `SUMMARY:${escapeText(title)}`,
    location ? `LOCATION:${escapeText(location)}` : null,
    description ? `DESCRIPTION:${escapeText(description)}` : null,
    "STATUS:CONFIRMED",
    // 30-minute display reminder
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);

  // CRLF line endings are required by the spec.
  return lines.map(fold).join("\r\n") + "\r\n";
}
