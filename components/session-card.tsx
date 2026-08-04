"use client";

import Link from "next/link";
import { Clock, MapPin, User, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AddToCalendarLink } from "@/components/add-to-calendar-link";
import { WibTrackPicker, type BookableTrack } from "@/components/wib-track-booking";

export type SessionCardStatus =
  | "bookable"
  | "booked"
  | "booked_auto"
  | "full"
  | "no_tickets"
  | "deadline_passed";

export function SessionCard({
  eventId,
  sessionId,
  title,
  description,
  timeLabel,
  venueName,
  venueLocation,
  speaker,
  clubName,
  seatsRemaining,
  capacity,
  status,
  wibTracks,
  inCart,
  cartTrackLabel,
  addDisabled,
  addDisabledReason,
  onAdd,
  onAddWibTrack,
  onRemove,
}: {
  eventId: string;
  sessionId: string;
  title: string;
  description?: string | null;
  timeLabel: string;
  venueName: string;
  venueLocation?: string | null;
  speaker?: string | null;
  clubName?: string | null;
  seatsRemaining: number;
  capacity: number;
  status: SessionCardStatus;
  wibTracks?: BookableTrack[];
  // Cart wiring — the card is presentational; the parent owns the cart state.
  inCart: boolean;
  cartTrackLabel?: string | null;
  addDisabled?: boolean;
  addDisabledReason?: string;
  onAdd: () => void;
  onAddWibTrack: (trackId: string, trackLabel: string) => void;
  onRemove: () => void;
}) {
  const isBooked = status === "booked" || status === "booked_auto";

  return (
    <Card className={cn("flex flex-col", (isBooked || inCart) && "ring-2 ring-primary/30")}>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/events/${eventId}/sessions/${sessionId}`}
            className="text-base font-semibold tracking-tight hover:underline"
          >
            {title}
          </Link>
          <StatusBadge status={status} seatsRemaining={seatsRemaining} />
        </div>

        {clubName && (
          <span className="inline-flex w-fit items-center rounded-full bg-brand-navy-tint px-2.5 py-0.5 text-xs font-medium text-primary">
            {clubName}
          </span>
        )}

        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-primary/70" />
            {timeLabel}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary/70" />
            {venueName}
            {venueLocation ? `, ${venueLocation}` : ""}
          </span>
          {speaker && (
            <span className="flex items-center gap-2">
              <User className="size-4 shrink-0 text-primary/70" />
              {speaker}
            </span>
          )}
          <span className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-primary/70" />
            <span className={cn(seatsRemaining <= 3 && seatsRemaining > 0 && "font-medium text-warning")}>
              {seatsRemaining} of {capacity} seats remaining
            </span>
          </span>
        </div>

        <Link
          href={`/events/${eventId}/sessions/${sessionId}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View details
        </Link>

        <div className="mt-auto pt-1">
          {status === "bookable" ? (
            inCart ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 rounded-lg bg-brand-navy-tint py-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="size-4" />
                  In your plan{cartTrackLabel ? ` · ${cartTrackLabel}` : ""}
                </div>
                <Button variant="outline" size="sm" onClick={onRemove} className="w-full">
                  Remove
                </Button>
              </div>
            ) : wibTracks && wibTracks.length > 0 ? (
              <WibTrackPicker
                tracks={wibTracks}
                disabled={addDisabled}
                disabledReason={addDisabledReason}
                onAdd={onAddWibTrack}
              />
            ) : (
              <Button onClick={onAdd} disabled={addDisabled} title={addDisabledReason} className="w-full">
                Add to plan
              </Button>
            )
          ) : isBooked ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-success-bg py-2 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" />
                {status === "booked_auto" ? "Auto-assigned" : "Booked"}
              </div>
              <AddToCalendarLink eventId={eventId} sessionId={sessionId} className="w-full" />
            </div>
          ) : (
            <Button variant="outline" disabled className="w-full">
              {status === "full"
                ? "Full"
                : status === "no_tickets"
                  ? "No tickets remaining"
                  : "Booking closed"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
  seatsRemaining,
}: {
  status: SessionCardStatus;
  seatsRemaining: number;
}) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  switch (status) {
    case "booked":
    case "booked_auto":
      return <span className={cn(base, "bg-success-bg text-success")}>Booked ✓</span>;
    case "full":
      return <span className={cn(base, "bg-danger-bg text-danger")}>Full</span>;
    case "no_tickets":
      return <span className={cn(base, "bg-disabled-bg text-disabled-fg")}>No tickets</span>;
    case "deadline_passed":
      return <span className={cn(base, "bg-disabled-bg text-disabled-fg")}>Closed</span>;
    default:
      return seatsRemaining <= 3 ? (
        <span className={cn(base, "bg-warning-bg text-warning")}>{seatsRemaining} left</span>
      ) : null;
  }
}
