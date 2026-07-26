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
import { cn } from "@/lib/utils";
import {
  manualBookingOverride,
  manualGroupBookingOverride,
  type ActionState,
  type GroupBookingActionState,
} from "@/app/admin/events/[eventId]/actions";
import { COHORT_SPLITS } from "@/lib/cohortSplits";

type SessionOption = { id: string; title: string; dayLabel: string; capacity: number; bookedCount: number };

function SessionSelect({ id, sessions }: { id: string; sessions: SessionOption[] }) {
  const [selectedId, setSelectedId] = useState("");
  const selected = sessions.find((s) => s.id === selectedId);
  const remaining = selected ? Math.max(selected.capacity - selected.bookedCount, 0) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Session</Label>
      <select
        id={id}
        name="sessionId"
        required
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm"
      >
        <option value="">Select a session…</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.dayLabel} — {s.title}
          </option>
        ))}
      </select>
      {remaining !== null && (
        <p className="text-xs text-muted-foreground">
          {remaining} of {selected!.capacity} seats remaining — capacity can&apos;t be bypassed.
        </p>
      )}
    </div>
  );
}

function SingleUserForm({
  eventId,
  users,
  sessions,
  onDone,
}: {
  eventId: string;
  users: { id: string; name: string; isbEmail: string }[];
  sessions: SessionOption[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    manualBookingOverride.bind(null, eventId),
    undefined
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
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

      <SessionSelect id="single-sessionId" sessions={sessions} />

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
  );
}

function GroupBookingForm({
  eventId,
  sessions,
  cohortSplitCounts,
}: {
  eventId: string;
  sessions: SessionOption[];
  cohortSplitCounts: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState<GroupBookingActionState, FormData>(
    manualGroupBookingOverride.bind(null, eventId),
    undefined
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form action={formAction} className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Groups</Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-input p-3">
            {COHORT_SPLITS.map((split) => (
              <label key={split} className="flex items-center gap-2 text-sm">
                <Checkbox name="cohortSplits" value={split} />
                {split}
                <span className="text-xs text-muted-foreground">
                  ({cohortSplitCounts[split] ?? 0})
                </span>
              </label>
            ))}
          </div>
        </div>

        <SessionSelect id="group-sessionId" sessions={sessions} />

        <div className="flex items-center gap-2">
          <Checkbox id="group-bypassTicketCheck" name="bypassTicketCheck" />
          <Label htmlFor="group-bypassTicketCheck" className="font-normal">
            Bypass ticket-remaining check
          </Label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-note">Reason (required)</Label>
          <Textarea id="group-note" name="note" rows={2} required />
        </div>

        {state?.error && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Booking…" : "Book group"}
          </Button>
        </DialogFooter>
      </form>

      {state?.summary && (
        <div className="flex min-w-0 flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium">
            Booked <span className="text-success">{state.summary.booked}</span> of{" "}
            {state.summary.total}
            {state.summary.skipped > 0 && (
              <span className="text-muted-foreground"> — {state.summary.skipped} skipped</span>
            )}
          </p>
          <div className="flex max-h-48 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border">
            {state.results?.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <span className="truncate">
                  {r.name} <span className="text-xs text-muted-foreground">({r.pgpId})</span>
                </span>
                <span className={cn("shrink-0 text-xs", r.outcome === "Booked" ? "text-success" : "text-muted-foreground")}>
                  {r.outcome}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ManualBookingDialog({
  eventId,
  users,
  sessions,
  cohortSplitCounts,
}: {
  eventId: string;
  users: { id: string; name: string; isbEmail: string }[];
  sessions: SessionOption[];
  cohortSplitCounts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "group">("single");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMode("single");
      }}
    >
      <DialogTrigger render={<Button variant="outline">Manual booking override</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual booking override</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-md bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={cn(
              "flex-1 rounded-sm px-2 py-1 text-sm font-medium transition-colors",
              mode === "single" ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            Single user
          </button>
          <button
            type="button"
            onClick={() => setMode("group")}
            className={cn(
              "flex-1 rounded-sm px-2 py-1 text-sm font-medium transition-colors",
              mode === "group" ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            Whole group
          </button>
        </div>

        {mode === "single" ? (
          <SingleUserForm eventId={eventId} users={users} sessions={sessions} onDone={() => setOpen(false)} />
        ) : (
          <GroupBookingForm eventId={eventId} sessions={sessions} cohortSplitCounts={cohortSplitCounts} />
        )}
      </DialogContent>
    </Dialog>
  );
}
