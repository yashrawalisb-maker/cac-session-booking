// The seven fixed "table tracks" for a Women in Business (club value "wib") session. Each track
// is a mini-session with its own capacity + speaker; a student booking a WIB session picks exactly
// one. Fixed like lib/clubs.ts — change the list here (no code elsewhere) to adjust year-to-year.
// Only WIB sessions use these; every other club/session is unaffected.

export const WIB_TRACKS = [
  { value: "product_technology", label: "Product and Technology" },
  { value: "brand_marketing", label: "Brand and Marketing" },
  { value: "operations", label: "Operations" },
  { value: "strategy", label: "Strategy" },
  { value: "finance", label: "Finance" },
  { value: "sustainability_impact", label: "Sustainability and Impact" },
  { value: "founder", label: "Founder" },
] as const;

export type WibTrackValue = (typeof WIB_TRACKS)[number]["value"];

/** The club value whose sessions are split into the tracks above. */
export const WIB_CLUB_VALUE = "wib";

const BY_VALUE = new Map(WIB_TRACKS.map((t) => [t.value as string, t]));

export function isWibTrackValue(value: string): value is WibTrackValue {
  return BY_VALUE.has(value);
}

/** Display label for a stored track value; falls back to the raw value if unknown. */
export function wibTrackLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return BY_VALUE.get(value)?.label ?? value;
}

export function isWibClub(club: string | null | undefined): boolean {
  return club === WIB_CLUB_VALUE;
}

const ORDER = new Map(WIB_TRACKS.map((t, i) => [t.value as string, i]));

/** Sort key so track rows always display in the fixed WIB_TRACKS order regardless of DB order. */
export function wibTrackOrder(track: string): number {
  return ORDER.get(track) ?? WIB_TRACKS.length;
}
