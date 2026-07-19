"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookSessionAction, type BookActionState } from "@/app/events/[eventId]/actions";
import type { SessionCardStatus } from "@/components/session-card";

export function SessionBookPanel({
  eventId,
  sessionId,
  status,
}: {
  eventId: string;
  sessionId: string;
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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Book your slot</h3>
        <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
          Free
        </span>
      </div>

      {state?.error && (
        <p role="alert" className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      {effectiveStatus === "bookable" ? (
        <form action={formAction}>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Booking…" : "Book this slot"}
          </Button>
        </form>
      ) : isBooked ? (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-success-bg py-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" />
          {effectiveStatus === "booked_auto" ? "Booked (Auto-assigned)" : "Booked"}
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

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {isBooked
          ? "This booking is final and can't be changed."
          : "You won't be charged for booking this event."}
      </p>
    </div>
  );
}
