"use client";

import { useMemo, useState } from "react";
import { SessionCard, type SessionCardStatus } from "@/components/session-card";
import type { BookableTrack } from "@/components/wib-track-booking";
import { clubShort } from "@/lib/clubs";
import { cn } from "@/lib/utils";

export type FilterableSession = {
  sessionId: string;
  title: string;
  description: string | null;
  dayLabel: string;
  timeLabel: string;
  // Numeric bounds (epoch ms) for grouping concurrent sessions, plus time-only labels for the
  // slot header. Formatted server-side so the timezone (IST) is consistent for every viewer.
  startsAtMs: number;
  endsAtMs: number;
  startLabel: string;
  endLabel: string;
  venueName: string;
  venueLocation: string | null;
  speaker: string | null;
  club: string | null;
  seatsRemaining: number;
  capacity: number;
  status: SessionCardStatus;
  wibTracks?: BookableTrack[];
};

/**
 * Group a day's sessions into time-slot rows: consecutive sessions whose times overlap land in the
 * same row (the student can attend only one of them). Standard merge-overlapping-intervals — a
 * session joins the current row if it starts before the row's running end, otherwise a new row
 * starts. Sessions must already be scoped to one day.
 */
function groupIntoTimeRows(sessions: FilterableSession[]): FilterableSession[][] {
  const sorted = [...sessions].sort((a, b) => a.startsAtMs - b.startsAtMs || a.endsAtMs - b.endsAtMs);
  const rows: FilterableSession[][] = [];
  let current: FilterableSession[] = [];
  let runningEnd = -Infinity;
  for (const s of sorted) {
    if (current.length === 0 || s.startsAtMs < runningEnd) {
      current.push(s);
      runningEnd = Math.max(runningEnd, s.endsAtMs);
    } else {
      rows.push(current);
      current = [s];
      runningEnd = s.endsAtMs;
    }
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

/** Slot label spanning the row: earliest start → latest end. */
function rowTimeLabel(row: FilterableSession[]): string {
  const start = row[0].startLabel; // row is sorted by start
  const latest = row.reduce((m, s) => (s.endsAtMs > m.endsAtMs ? s : m), row[0]);
  return `${start} – ${latest.endLabel}`;
}

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
        dayLabels.map((day) => {
          const rows = groupIntoTimeRows(filtered.filter((s) => s.dayLabel === day));
          return (
            <section key={day}>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">{day}</h2>
              <div className="flex flex-col gap-6">
                {rows.map((row, i) => (
                  <div key={i} className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 border-l-2 border-primary/40 pl-2.5">
                      <span className="text-sm font-semibold text-foreground">{rowTimeLabel(row)}</span>
                      {row.length > 1 && (
                        <span className="inline-flex items-center rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">
                          {row.length} concurrent · pick one
                        </span>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {row.map((s) => (
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
                          wibTracks={s.wibTracks}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
