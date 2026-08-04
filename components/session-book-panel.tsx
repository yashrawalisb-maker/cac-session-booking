"use client";

import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionCardStatus } from "@/components/session-card";
import { AddToCalendarLink } from "@/components/add-to-calendar-link";
import { WibTrackPicker, type BookableTrack } from "@/components/wib-track-booking";
import { BookingCartBar } from "@/components/booking-cart-bar";
import { useCart } from "@/lib/useCart";

const overlaps = (a: { startsAtMs: number; endsAtMs: number }, b: { startsAtMs: number; endsAtMs: number }) =>
  a.startsAtMs < b.endsAtMs && b.startsAtMs < a.endsAtMs;

export function SessionBookPanel({
  eventId,
  sessionId,
  sessionTitle,
  timeLabel,
  startsAtMs,
  endsAtMs,
  status,
  wibTracks,
  ticketsRemaining,
  overlapCheckEnabled,
  occupied,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle?: string;
  timeLabel: string;
  startsAtMs: number;
  endsAtMs: number;
  status: SessionCardStatus;
  wibTracks?: BookableTrack[];
  ticketsRemaining: number;
  overlapCheckEnabled: boolean;
  occupied: { startsAtMs: number; endsAtMs: number }[];
}) {
  const isBooked = status === "booked" || status === "booked_auto";
  const cart = useCart(eventId);
  const inCart = cart.has(sessionId);
  const cartItem = cart.items.find((i) => i.sessionId === sessionId);

  const allOccupied = useMemo(
    () => [...occupied, ...cart.items.filter((i) => i.sessionId !== sessionId).map((i) => ({ startsAtMs: i.startsAtMs, endsAtMs: i.endsAtMs }))],
    [occupied, cart.items, sessionId]
  );
  const capReached = cart.count >= ticketsRemaining;
  const clashes = overlapCheckEnabled && allOccupied.some((o) => overlaps({ startsAtMs, endsAtMs }, o));
  const addDisabled = !inCart && (capReached || clashes);
  const addDisabledReason = capReached
    ? "You've planned all your available tickets"
    : clashes
      ? "Overlaps a session already in your plan or bookings"
      : undefined;

  function add() {
    cart.add({ sessionId, title: sessionTitle ?? "", timeLabel, startsAtMs, endsAtMs });
  }
  function addWibTrack(trackId: string, trackLabel: string) {
    cart.add({ sessionId, title: sessionTitle ?? "", timeLabel, startsAtMs, endsAtMs, sessionTrackId: trackId, trackLabel });
  }

  return (
    <div className={cart.count > 0 ? "pb-20" : undefined}>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Book your slot</h3>
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
            Free
          </span>
        </div>

        {status === "bookable" ? (
          inCart ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-brand-navy-tint py-2 text-sm font-medium text-primary">
                <CheckCircle2 className="size-4" />
                In your plan{cartItem?.trackLabel ? ` · ${cartItem.trackLabel}` : ""}
              </div>
              <Button variant="outline" size="sm" onClick={() => cart.remove(sessionId)} className="w-full">
                Remove
              </Button>
            </div>
          ) : wibTracks && wibTracks.length > 0 ? (
            <WibTrackPicker tracks={wibTracks} disabled={addDisabled} disabledReason={addDisabledReason} onAdd={addWibTrack} />
          ) : (
            <Button onClick={add} disabled={addDisabled} title={addDisabledReason} className="w-full">
              Add to plan
            </Button>
          )
        ) : isBooked ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-success-bg py-2 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" />
              {status === "booked_auto" ? "Booked (Auto-assigned)" : "Booked"}
            </div>
            <AddToCalendarLink eventId={eventId} sessionId={sessionId} className="w-full" />
          </div>
        ) : (
          <Button variant="outline" disabled className="w-full">
            {status === "full" ? "Full" : status === "no_tickets" ? "No tickets remaining" : "Booking closed"}
          </Button>
        )}

        <p className="mt-2 text-center text-xs text-muted-foreground">
          {isBooked
            ? "This booking is final and can't be changed."
            : inCart
              ? "Not booked yet — confirm your plan below to finalize it."
              : "You won't be charged for booking this event."}
        </p>
      </div>

      <BookingCartBar eventId={eventId} items={cart.items} remove={cart.remove} clear={cart.clear} ticketsRemaining={ticketsRemaining} />
    </div>
  );
}
