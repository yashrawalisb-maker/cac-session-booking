"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <StatusBadge status={effectiveStatus} seatsRemaining={seatsRemaining} />
        </div>
        <CardDescription>{timeLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {description && <p className="text-muted-foreground">{description}</p>}
        <p>
          <span className="font-medium">Venue:</span> {venueName}
          {venueLocation ? `, ${venueLocation}` : ""}
        </p>
        {speaker && (
          <p>
            <span className="font-medium">Speaker:</span> {speaker}
          </p>
        )}
        <p className="text-muted-foreground">
          {seatsRemaining} of {capacity} seats remaining
        </p>

        {state?.error && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-danger">
            {state.error}
          </p>
        )}

        {effectiveStatus === "bookable" ? (
          <form action={formAction}>
            <Button type="submit" disabled={pending} className="mt-1 w-full sm:w-auto">
              {pending ? "Booking…" : "Book"}
            </Button>
          </form>
        ) : null}
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
  switch (status) {
    case "booked":
      return (
        <Badge className="bg-success-bg text-success" variant="secondary">
          Booked ✓
        </Badge>
      );
    case "booked_auto":
      return (
        <Badge className="bg-success-bg text-success" variant="secondary">
          Booked ✓ (Auto-assigned)
        </Badge>
      );
    case "full":
      return (
        <Badge className="bg-disabled-bg text-disabled-fg" variant="secondary">
          Full
        </Badge>
      );
    case "no_tickets":
      return (
        <Badge className="bg-disabled-bg text-disabled-fg" variant="secondary">
          No tickets remaining
        </Badge>
      );
    case "deadline_passed":
      return (
        <Badge className="bg-disabled-bg text-disabled-fg" variant="secondary">
          Booking closed
        </Badge>
      );
    default:
      return seatsRemaining <= 3 ? (
        <Badge className="bg-warning-bg text-warning" variant="secondary">
          {seatsRemaining} left
        </Badge>
      ) : null;
  }
}
