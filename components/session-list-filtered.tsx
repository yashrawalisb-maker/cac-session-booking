"use client";

import { useMemo, useState } from "react";
import { SessionCard, type SessionCardStatus } from "@/components/session-card";
import { clubShort } from "@/lib/clubs";
import { cn } from "@/lib/utils";

export type FilterableSession = {
  sessionId: string;
  title: string;
  description: string | null;
  dayLabel: string;
  timeLabel: string;
  venueName: string;
  venueLocation: string | null;
  speaker: string | null;
  club: string | null;
  seatsRemaining: number;
  capacity: number;
  status: SessionCardStatus;
};

export function SessionListFiltered({
  eventId,
  sessions,
}: {
  eventId: string;
  sessions: FilterableSession[];
}) {
  // Multi-select: empty set = no filter (show everything).
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Only offer chips for clubs that actually have sessions in this event.
  const clubsPresent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (s.club) counts.set(s.club, (counts.get(s.club) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [sessions]);

  function toggle(club: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(club)) next.delete(club);
      else next.add(club);
      return next;
    });
  }

  const filtered =
    selected.size === 0 ? sessions : sessions.filter((s) => s.club && selected.has(s.club));

  // Preserve the original (chronological) day order.
  const dayLabels = Array.from(new Set(filtered.map((s) => s.dayLabel)));

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors";

  return (
    <div className="flex flex-col gap-6">
      {clubsPresent.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            aria-pressed={selected.size === 0}
            className={cn(
              chipBase,
              selected.size === 0
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            All clubs
          </button>
          {clubsPresent.map((c) => {
            const active = selected.has(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle(c.value)}
                aria-pressed={active}
                className={cn(
                  chipBase,
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {clubShort(c.value)}
                <span className={cn("text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground/70")}>
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No sessions match the selected club(s).
        </p>
      ) : (
        dayLabels.map((day) => (
          <section key={day}>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">{day}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered
                .filter((s) => s.dayLabel === day)
                .map((s) => (
                  <SessionCard
                    key={s.sessionId}
                    eventId={eventId}
                    sessionId={s.sessionId}
                    title={s.title}
                    description={s.description}
                    timeLabel={s.timeLabel}
                    venueName={s.venueName}
                    venueLocation={s.venueLocation}
                    speaker={s.speaker}
                    clubName={clubShort(s.club)}
                    seatsRemaining={s.seatsRemaining}
                    capacity={s.capacity}
                    status={s.status}
                  />
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
