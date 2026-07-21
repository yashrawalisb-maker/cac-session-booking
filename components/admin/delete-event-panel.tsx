"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteEvent } from "@/app/admin/events/[eventId]/actions";

export function DeleteEventPanel({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = confirm.trim() === eventName;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to /admin, so control won't return here.
      const res = await deleteEvent(eventId, confirm);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-danger/40 p-4">
      <div>
        <h3 className="text-sm font-medium text-danger">Delete event</h3>
        <p className="text-xs text-muted-foreground">
          Permanently removes this event along with all its sessions, ticket allotments, and
          bookings. This can&apos;t be undone.
        </p>
      </div>

      <div>
        <Button variant="destructive" onClick={() => setOpen(true)} disabled={pending}>
          <Trash2 className="size-4" />
          Delete event
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{eventName}”?</DialogTitle>
            <DialogDescription>
              This permanently deletes the event and <strong>every</strong> session, ticket
              allotment, and booking under it. This cannot be undone. To confirm, type the event
              name below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-name">
              Type <span className="font-semibold">{eventName}</span> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={eventName}
              autoComplete="off"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || pending}>
              {pending ? "Deleting…" : "Delete this event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
