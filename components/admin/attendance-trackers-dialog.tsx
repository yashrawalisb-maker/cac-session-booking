"use client";

import { useActionState, useState, useTransition } from "react";
import { X } from "lucide-react";
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
import {
  grantAttendanceAccess,
  revokeAttendanceAccess,
  type ActionState,
} from "@/app/admin/events/[eventId]/actions";

export type TrackerGrant = { id: string; userId: string; name: string; isbEmail: string };

export function AttendanceTrackersDialog({
  eventId,
  sessionId,
  sessionTitle,
  grants,
  users,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle: string;
  grants: TrackerGrant[];
  users: { id: string; name: string; isbEmail: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    grantAttendanceAccess.bind(null, eventId, sessionId),
    undefined
  );
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const grantedUserIds = new Set(grants.map((g) => g.userId));
  const available = users.filter((u) => !grantedUserIds.has(u.id));

  function remove(grantId: string) {
    setRemovingId(grantId);
    startTransition(async () => {
      await revokeAttendanceAccess(eventId, grantId);
      setRemovingId(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Trackers{grants.length > 0 ? ` (${grants.length})` : ""}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendance trackers</DialogTitle>
          <DialogDescription>
            People granted access below can mark attendance for &ldquo;{sessionTitle}&rdquo; only —
            they are not made admins.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has been granted access yet.</p>
          ) : (
            grants.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{g.isbEmail}</p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={removingId === g.id}
                  onClick={() => remove(g.id)}
                  aria-label={`Remove ${g.name}`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`grant-user-${sessionId}`}>Add a tracker</Label>
            <select
              id={`grant-user-${sessionId}`}
              name="userId"
              required
              defaultValue=""
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="" disabled>
                Select a roster member…
              </option>
              {available.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.isbEmail})
                </option>
              ))}
            </select>
          </div>

          {state?.error && (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending || available.length === 0}>
              {pending ? "Adding…" : "Grant access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
