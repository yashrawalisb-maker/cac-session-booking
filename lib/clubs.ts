// Single source of truth for the CAC clubs that run sessions. String values (not a Prisma
// enum) so the list can change year-to-year by editing this array alone — no DB migration.
// The stored value is the stable `value`; `label`/`short` are display-only.

export const CLUBS = [
  { value: "wib", label: "Women in Business", short: "WIB" },
  { value: "public_speaking", label: "Public Speaking", short: "Public Speaking" },
  { value: "finance", label: "Finance", short: "Finance" },
  { value: "evc", label: "Entrepreneurship & Venture Capital", short: "EVC" },
  { value: "bac", label: "Business Analytics", short: "BAC" },
  { value: "consulting", label: "Consulting", short: "Consulting" },
  { value: "marketing", label: "Marketing", short: "Marketing" },
  { value: "operations", label: "Operations", short: "Operations" },
  { value: "net_impact", label: "Net Impact", short: "Net Impact" },
  { value: "btc", label: "Business Technology", short: "BTC" },
] as const;

export type ClubValue = (typeof CLUBS)[number]["value"];

const BY_VALUE = new Map(CLUBS.map((c) => [c.value as string, c]));

export function isClubValue(value: string): value is ClubValue {
  return BY_VALUE.has(value);
}

/** Full display name for a stored club value; falls back to the raw value if unknown. */
export function clubLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return BY_VALUE.get(value)?.label ?? value;
}

/** Short label for chips/badges; falls back to the raw value if unknown. */
export function clubShort(value: string | null | undefined): string | null {
  if (!value) return null;
  return BY_VALUE.get(value)?.short ?? value;
}
