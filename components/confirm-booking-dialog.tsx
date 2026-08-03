"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { bookSessionAction, type BookActionState } from "@/app/events/[eventId]/actions";

/**
 * A confirm step before a (non-WIB) booking is created. A booking is final and can't be undone by
 * the student, so "Book this slot" opens this dialog first rather than booking on the click — the
 * student makes a conscious choice instead of a stray tap. Booking commits only on "Confirm booking".
 */
export function ConfirmBookingDialog({
  eventId,
  sessionId,
  sessionTitle,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<BookActionState, FormData>(
    bookSessionAction.bind(null, eventId, sessionId),
    undefined
  );

  useEffect(() => {
    // Close once the booking succeeds; the page revalidates and the card/panel re-render as "Booked".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full">Book this slot</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm booking</DialogTitle>
          <DialogDescription>
            You&apos;re booking{" "}
            <span className="font-medium text-foreground">{sessionTitle || "this session"}</span>. This
            booking is <span className="font-medium text-foreground">final</span> — it can&apos;t be
            changed or cancelled once confirmed.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          {state?.error && (
            <p role="alert" className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={pending}>
              {pending ? "Booking…" : "Confirm booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
