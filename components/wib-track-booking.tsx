"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { bookSessionAction, type BookActionState } from "@/app/events/[eventId]/actions";

export type BookableTrack = {
  id: string;
  label: string;
  speakerName: string | null;
  seatsRemaining: number;
};

/**
 * The Women in Business booking flow: "Book this slot" opens a modal that forces the student to
 * pick one of the session's table tracks (each with its own seats) before the booking is created.
 * Confirm stays disabled until a track is chosen. Non-WIB sessions never render this.
 */
export function WibTrackBooking({
  eventId,
  sessionId,
  tracks,
  triggerClassName,
}: {
  eventId: string;
  sessionId: string;
  tracks: BookableTrack[];
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [state, formAction, pending] = useActionState<BookActionState, FormData>(
    bookSessionAction.bind(null, eventId, sessionId),
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className={cn("w-full", triggerClassName)}>Book this slot</Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your table track</DialogTitle>
          <DialogDescription>
            This Women in Business session runs seven parallel tracks — pick the one you want to
            join. You can only book one.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {tracks.map((t) => {
              const full = t.seatsRemaining <= 0;
              return (
                <label
                  key={t.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                    full
                      ? "cursor-not-allowed border-border opacity-50"
                      : selected === t.id
                        ? "cursor-pointer border-primary bg-brand-navy-tint"
                        : "cursor-pointer border-border hover:border-primary/50"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <input
                      type="radio"
                      name="sessionTrackId"
                      value={t.id}
                      disabled={full}
                      checked={selected === t.id}
                      onChange={() => setSelected(t.id)}
                      className="size-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{t.label}</span>
                      {t.speakerName && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.speakerName}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-xs", full ? "text-danger" : "text-muted-foreground")}>
                    {full ? "Full" : `${t.seatsRemaining} left`}
                  </span>
                </label>
              );
            })}
          </div>

          {state?.error && (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            This booking is final — it can&apos;t be changed or cancelled once confirmed.
          </p>

          <DialogFooter>
            <Button type="submit" disabled={pending || !selected}>
              {pending ? "Booking…" : "Confirm booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
