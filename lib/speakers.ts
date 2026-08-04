/** One speaker on a session. Only `name` is required; the rest enrich the detail page. */
export type SessionSpeaker = {
  name: string;
  role: string | null;
  photoUrl: string | null;
  bio: string | null;
  profileUrl: string | null;
};

/** The flat legacy speaker columns a session may still carry (pre-multi-speaker rows). */
type LegacySpeakerFields = {
  speakers?: unknown;
  speakerName?: string | null;
  speakerRole?: string | null;
  speakerPhotoUrl?: string | null;
  speakerBio?: string | null;
  speakerProfileUrl?: string | null;
  speakerDescription?: string | null;
};

function coerceSpeaker(value: unknown): SessionSpeaker | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  if (!name) return null;
  const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : null);
  return {
    name,
    role: str(v.role),
    photoUrl: str(v.photoUrl),
    bio: str(v.bio),
    profileUrl: str(v.profileUrl),
  };
}

/** Parse the `speakers` JSON column into a clean, name-required list (drops malformed entries). */
export function parseSpeakers(raw: unknown): SessionSpeaker[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.map(coerceSpeaker).filter((s): s is SessionSpeaker => s !== null);
}

/**
 * The speakers to actually display for a session: the multi-speaker `speakers` array when set,
 * otherwise a single speaker synthesized from the legacy flat columns. Empty when there's nothing.
 */
export function effectiveSpeakers(session: LegacySpeakerFields): SessionSpeaker[] {
  const parsed = parseSpeakers(session.speakers);
  if (parsed.length > 0) return parsed;

  const name = session.speakerName?.trim() || session.speakerDescription?.trim() || "";
  const bio = session.speakerBio?.trim() || session.speakerDescription?.trim() || null;
  if (!name && !bio) return [];
  return [
    {
      name: name || "Speaker",
      role: session.speakerRole?.trim() || null,
      photoUrl: session.speakerPhotoUrl?.trim() || null,
      bio,
      profileUrl: session.speakerProfileUrl?.trim() || null,
    },
  ];
}

/** Label for cards/lists: "Ekta Parashar" or "Ekta Parashar, Rohan Mehta". */
export function speakersLabel(speakers: SessionSpeaker[]): string | null {
  if (speakers.length === 0) return null;
  return speakers.map((s) => s.name).join(", ");
}
