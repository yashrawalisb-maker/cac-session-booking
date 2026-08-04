"use client";

import { useMemo, useState } from "react";
import { SessionCard, type SessionCardStatus } from "@/components/session-card";
import type { BookableTrack } from "@/components/wib-track-booking";
import { BookingCartBar } from "@/components/booking-cart-bar";
import { useCart } from "@/lib/useCart";
import { clubShort } from "@/lib/clubs";
import { cn } from "@/lib/utils";

export type FilterableSession = {
  sessionId: string;
  title: string;
  description: string | null;
  dayLabel: string;
  timeLabel: string;
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

function rowTimeLabel(row: FilterableSession[]): string {
  const start = row[0].startLabel;
  const latest = row.reduce((m, s) => (s.endsAtMs > m.endsAtMs ? s : m), row[0]);
  return `${start} – ${latest.endLabel}`;
}

const overlaps = (a: { startsAtMs: number; endsAtMs: number }, b: { startsAtMs: number; endsAtMs: number }) =>
  a.startsAtMs < b.endsAtMs && b.startsAtMs < a.endsAtMs;

export function SessionListFiltered({
  eventId,
  sessions,
  ticketsRemaining,
  overlapCheckEnabled,
}: {
  eventId: string;
  sessions: FilterableSession[];
  ticketsRemaining: number;
  overlapCheckEnabled: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const cart = useCart(eventId);

  const clubsPresent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (s.club) counts.set(s.club, (counts.get(s.club) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [sessions]);

  // Time windows the student can't double-book against: their already-booked sessions + cart picks.
  const occupied = useMemo(() => {
    const booked = sessions
      .filter((s) => s.status === "booked" || s.status === "booked_auto")
      .map((s) => ({ startsAtMs: s.startsAtMs, endsAtMs: s.endsAtMs }));
    const inCart = cart.items.map((i) => ({ startsAtMs: i.startsAtMs, endsAtMs: i.endsAtMs }));
    return [...booked, ...inCart];
  }, [sessions, cart.items]);

  const capReached = cart.count >= ticketsRemaining;

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
  const dayLabels = Array.from(new Set(filtered.map((s) => s.dayLabel)));

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors";

  return (
    <div className={cn("flex flex-col gap-6", cart.count > 0 && "pb-20")}>
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
                      {row.map((s) => {
                        const inCart = cart.has(s.sessionId);
                        const clashes = overlapCheckEnabled && occupied.some((o) => overlaps(s, o));
                        const addDisabled = !inCart && (capReached || clashes);
                        const addDisabledReason = capReached
                          ? "You've planned all your available tickets"
                          : clashes
                            ? "Overlaps a session already in your plan or bookings"
                            : undefined;
                        return (
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
                            inCart={inCart}
                            cartTrackLabel={cart.items.find((i) => i.sessionId === s.sessionId)?.trackLabel}
                            addDisabled={addDisabled}
                            addDisabledReason={addDisabledReason}
                            onAdd={() =>
                              cart.add({
                                sessionId: s.sessionId,
                                title: s.title,
                                timeLabel: s.timeLabel,
                                startsAtMs: s.startsAtMs,
                                endsAtMs: s.endsAtMs,
                              })
                            }
                            onAddWibTrack={(trackId, trackLabel) =>
                              cart.add({
                                sessionId: s.sessionId,
                                title: s.title,
                                timeLabel: s.timeLabel,
                                startsAtMs: s.startsAtMs,
                                endsAtMs: s.endsAtMs,
                                sessionTrackId: trackId,
                                trackLabel,
                              })
                            }
                            onRemove={() => cart.remove(s.sessionId)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      <BookingCartBar
        eventId={eventId}
        items={cart.items}
        remove={cart.remove}
        clear={cart.clear}
        ticketsRemaining={ticketsRemaining}
      />
    </div>
  );
}
