"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionCardStatus } from "@/components/session-card";
import { AddToCalendarLink } from "@/components/add-to-calendar-link";
import { WibTrackBooking, type BookableTrack } from "@/components/wib-track-booking";
import { ConfirmBookingDialog } from "@/components/confirm-booking-dialog";

export function SessionBookPanel({
  eventId,
  sessionId,
  sessionTitle,
  status,
  wibTracks,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle?: string;
  status: SessionCardStatus;
  wibTracks?: BookableTrack[];
}) {
  // Booking happens inside ConfirmBookingDialog / WibTrackBooking; this panel reflects the server
  // `status`, updated via revalidation after a booking.
  const effectiveStatus: SessionCardStatus = status;
  const isBooked = effectiveStatus === "booked" || effectiveStatus === "booked_auto";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Book your slot</h3>
        <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
          Free
        </span>
      </div>

      {effectiveStatus === "bookable" ? (
        wibTracks && wibTracks.length > 0 ? (
          <WibTrackBooking eventId={eventId} sessionId={sessionId} tracks={wibTracks} />
        ) : (
          <ConfirmBookingDialog eventId={eventId} sessionId={sessionId} sessionTitle={sessionTitle} />
        )
      ) : isBooked ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-success-bg py-2 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" />
            {effectiveStatus === "booked_auto" ? "Booked (Auto-assigned)" : "Booked"}
          </div>
          <AddToCalendarLink eventId={eventId} sessionId={sessionId} className="w-full" />
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
