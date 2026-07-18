"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resetAutoAllocations, resetAllBookings } from "@/app/admin/events/[eventId]/actions";

export function BookingResetPanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openAuto, setOpenAuto] = useState(false);
  const [openAll, setOpenAll] = useState(false);

  function run(action: (eventId: string) => Promise<{ error?: string; message?: string } | undefined>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await action(eventId);
      if (res?.error) {
        setError(res.error);
      } else {
        setMessage(res?.message ?? "Done.");
        router.refresh();
      }
      setOpenAuto(false);
      setOpenAll(false);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-medium">Reset bookings</h3>
        <p className="text-xs text-muted-foreground">
          Clear bookings to start over — e.g. to undo an auto-allocation run or wipe test data
          before going live. Capacity and ticket counts are recalculated automatically.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setOpenAuto(true)} disabled={pending}>
          <RotateCcw className="size-4" />
          Undo auto-allocation
        </Button>
        <Button variant="destructive" onClick={() => setOpenAll(true)} disabled={pending}>
          <Trash2 className="size-4" />
          Reset all bookings
        </Button>
      </div>

      {message && (
        <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">{message}</p>
      )}
      {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

      {/* Undo auto-allocation */}
      <Dialog open={openAuto} onOpenChange={setOpenAuto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo auto-allocation?</DialogTitle>
            <DialogDescription>
              This permanently deletes every <strong>auto-assigned</strong> booking for this event
              and frees up the seats and tickets they used. Sessions that participants booked
              themselves are kept. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAuto(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => run(resetAutoAllocations)}
              disabled={pending}
            >
              {pending ? "Resetting…" : "Yes, undo auto-allocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset all bookings */}
      <Dialog open={openAll} onOpenChange={setOpenAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset ALL bookings?</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>every</strong> booking for this event — both
              auto-assigned and participant-selected — and resets all tickets to unused. Use this
              only to clear test data. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAll(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => run(resetAllBookings)} disabled={pending}>
              {pending ? "Resetting…" : "Yes, delete all bookings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
