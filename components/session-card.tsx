"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Clock, MapPin, User, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { bookSessionAction, type BookActionState } from "@/app/events/[eventId]/actions";

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
}) {
  const boundAction = bookSessionAction.bind(null, eventId, sessionId);
  const [state, formAction, pending] = useActionState<BookActionState, FormData>(
    boundAction,
    undefined
  );

  const effectiveStatus: SessionCardStatus = state?.success ? "booked" : status;
  const isBooked = effectiveStatus === "booked" || effectiveStatus === "booked_auto";

  return (
    <Card className={cn("flex flex-col", isBooked && "ring-2 ring-success/40")}>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/events/${eventId}/sessions/${sessionId}`}
            className="text-base font-semibold tracking-tight hover:underline"
          >
            {title}
          </Link>
          <StatusBadge status={effectiveStatus} seatsRemaining={seatsRemaining} />
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

        {state?.error && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <div className="mt-auto pt-1">
          {effectiveStatus === "bookable" ? (
            <form action={formAction}>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Booking…" : "Book this slot"}
              </Button>
            </form>
          ) : isBooked ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-success-bg py-2 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" />
              {effectiveStatus === "booked_auto" ? "Auto-assigned" : "Booked"}
            </div>
          ) : (
            <Button variant="outline" disabled className="w-full">
              {effectiveStatus === "full"
                ? "Full"
                : effectiveStatus === "no_tickets"
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
