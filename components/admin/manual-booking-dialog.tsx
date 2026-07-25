"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { manualBookingOverride, type ActionState } from "@/app/admin/events/[eventId]/actions";

export function ManualBookingDialog({
  eventId,
  users,
  sessions,
}: {
  eventId: string;
  users: { id: string; name: string; isbEmail: string }[];
  sessions: { id: string; title: string; dayLabel: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    manualBookingOverride.bind(null, eventId),
    undefined
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Manual booking override</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual booking override</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="userId">User</Label>
            <select id="userId" name="userId" required className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">Select a user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.isbEmail})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sessionId">Session</Label>
            <select
              id="sessionId"
              name="sessionId"
              required
              className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Select a session…</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.dayLabel} — {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="bypassTicketCheck" name="bypassTicketCheck" />
            <Label htmlFor="bypassTicketCheck" className="font-normal">
              Bypass ticket-remaining check
            </Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Reason (required)</Label>
            <Textarea id="note" name="note" rows={2} required />
          </div>

          {state?.error && (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Booking…" : "Create booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
