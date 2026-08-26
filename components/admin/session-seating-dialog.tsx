"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importSessionSeatingXlsx, type ActionState } from "@/app/admin/events/[eventId]/actions";

export function SessionSeatingDialog({
  eventId,
  sessionId,
  sessionTitle,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    importSessionSeatingXlsx.bind(null, eventId, sessionId),
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">Seating chart</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seating chart</DialogTitle>
          <DialogDescription>
            Upload an .xlsx seating chart for &ldquo;{sessionTitle}&rdquo;. Rows are matched by PGID
            against this session&rsquo;s confirmed bookings only — upload after attendees have booked.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={`seatingFile-${sessionId}`}>Seating chart file (.xlsx)</Label>
            <input
              id={`seatingFile-${sessionId}`}
              name="file"
              type="file"
              accept=".xlsx"
              required
              className="text-sm"
            />
          </div>

          {state?.error && (
            <pre className="whitespace-pre-wrap rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </pre>
          )}
          {state?.message && (
            <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">{state.message}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
