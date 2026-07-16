export type TimeRange = { startsAt: Date; endsAt: Date };

/** True if two sessions overlap in time (touching endpoints do not count as overlap). */
export function sessionsOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}
