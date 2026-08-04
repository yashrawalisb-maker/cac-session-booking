"use client";

import { useState, useTransition } from "react";
import { Trash2, ShoppingBag } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { CartItem } from "@/lib/useCart";
import { confirmBookings } from "@/app/events/[eventId]/actions";

/**
 * Sticky "booking plan" bar + the final all-or-nothing Confirm dialog. Selections live in the cart
 * (localStorage) until the student confirms them all here; nothing is booked before that.
 */
export function BookingCartBar({
  eventId,
  items,
  remove,
  clear,
  ticketsRemaining,
}: {
  eventId: string;
  items: CartItem[];
  remove: (sessionId: string) => void;
  clear: () => void;
  ticketsRemaining: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [failedSessionId, setFailedSessionId] = useState<string | null>(null);

  if (items.length === 0) return null;

  // Students must confirm at least 2 sessions at once (the ticket cap already enforces the max of 3).
  const MIN_REQUIRED = 2;
  const belowMin = items.length < MIN_REQUIRED;
  const moreNeeded = MIN_REQUIRED - items.length;
  // A student with only 1 ticket can never reach the minimum — say so plainly instead of a
  // misleading "add more" nudge they have no room left to act on.
  const cannotReachMin = ticketsRemaining < MIN_REQUIRED;

  function confirm() {
    setError(null);
    setFailedSessionId(null);
    startTransition(async () => {
      const res = await confirmBookings(
        eventId,
        items.map((i) => ({ sessionId: i.sessionId, sessionTrackId: i.sessionTrackId }))
      );
      if (res?.error) {
        setError(res.error);
        setFailedSessionId(res.failedSessionId ?? null);
      } else {
        clear();
        setOpen(false);
      }
    });
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
        <span className="flex items-center gap-2 text-sm font-medium">
          <ShoppingBag className="size-4 text-primary" />
          {items.length} in your plan
          <span className="text-muted-foreground">· {ticketsRemaining} ticket{ticketsRemaining === 1 ? "" : "s"}</span>
        </span>
        {belowMin && (
          <span className="text-xs font-medium text-warning">
            {cannotReachMin
              ? "You need at least 2 tickets to confirm bookings"
              : `Add ${moreNeeded} more session${moreNeeded > 1 ? "s" : ""} to confirm`}
          </span>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                size="sm"
                disabled={belowMin}
                title={
                  belowMin
                    ? cannotReachMin
                      ? "You need at least 2 tickets to confirm bookings"
                      : `Add at least ${MIN_REQUIRED} sessions to your plan before confirming`
                    : undefined
                }
              >
                Review &amp; confirm
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm your bookings</DialogTitle>
              <DialogDescription>
                You&apos;re booking these {items.length} session{items.length > 1 ? "s" : ""}. Bookings
                are <span className="font-medium text-foreground">final</span> once confirmed.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
              {items.map((i) => (
                <div
                  key={i.sessionId}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                    failedSessionId === i.sessionId && "bg-danger-bg"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{i.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.timeLabel}
                      {i.trackLabel ? ` · ${i.trackLabel}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(i.sessionId)}
                    aria-label={`Remove ${i.title}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline">Keep choosing</Button>} />
              <Button type="button" onClick={confirm} disabled={pending}>
                {pending ? "Booking…" : `Confirm ${items.length} booking${items.length > 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
