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
} from "@/components/ui/dialog";
import { deleteSession, type ActionState } from "@/app/admin/events/[eventId]/actions";

export function DeleteSessionDialog({
  eventId,
  sessionId,
  sessionTitle,
  bookedCount,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle: string;
  bookedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    deleteSession.bind(null, eventId, sessionId),
    undefined
  );

  useEffect(() => {
    // Close once the delete succeeds (the row disappears on revalidation).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="destructive">
            Delete
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete session</DialogTitle>
          <DialogDescription>
            Permanently delete <span className="font-medium text-foreground">{sessionTitle || "this session"}</span>?
            This removes the session and everything under it. It can&apos;t be undone — use Cancel
            instead if you only want to close bookings.
          </DialogDescription>
        </DialogHeader>

        {bookedCount > 0 && (
          <p className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
            {bookedCount} confirmed booking{bookedCount > 1 ? "s" : ""} will be deleted. Those
            students will get their ticket{bookedCount > 1 ? "s" : ""} back.
          </p>
        )}

        <form action={formAction}>
          {state?.error && (
            <p role="alert" className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting…" : "Delete session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
