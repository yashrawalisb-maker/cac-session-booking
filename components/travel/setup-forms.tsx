"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InlineConfirm } from "./inline-confirm";
import {
  assignCohortSplit,
  clearAllAssignments,
  createTravelSlot,
  deleteTravelSlot,
  grantTravelCoordinator,
  importTravelAssignmentsCsv,
  revokeTravelCoordinator,
  updateTravelSlot,
  type ActionState,
} from "@/app/admin/travel/actions";

const inputCls = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring";

function Feedback({ state }: { state: ActionState }) {
  if (state?.error) return <pre className="whitespace-pre-wrap rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</pre>;
  if (state?.message) return <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">{state.message}</p>;
  return null;
}

export type SlotRow = { id: string; label: string; flightNo: string | null; departureLocal: string; departureText: string; students: number };

// ---- flights ----------------------------------------------------------------------------------

function FlightFields({ slot }: { slot?: SlotRow }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1.3fr]">
      <input name="label" required defaultValue={slot?.label} placeholder="Name, e.g. Day 1 Morning" className={inputCls} aria-label="Flight name" />
      <input name="flightNo" defaultValue={slot?.flightNo ?? ""} placeholder="Flight no. (optional)" className={inputCls} aria-label="Flight number" />
      <input name="departureAt" type="datetime-local" defaultValue={slot?.departureLocal} className={inputCls} aria-label="Departure (IST)" />
    </div>
  );
}

export function AddFlightForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createTravelSlot, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <FlightFields />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add flight"}
        </Button>
        <span className="text-xs text-muted-foreground">Departure is IST. Bus → Airport → Gate checkpoints are created automatically.</span>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function FlightRow({ slot }: { slot: SlotRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(updateTravelSlot.bind(null, slot.id), undefined);
  const [delState, setDelState] = useState<ActionState>(undefined);
  const [deleting, startDelete] = useTransition();
  // null = idle; { checkins: 0 } = first "are you sure"; { checkins: n } = second warning when it has check-ins
  const [askDelete, setAskDelete] = useState<{ checkins: number } | null>(null);

  function runDelete(withCheckins: boolean) {
    setDelState(undefined);
    startDelete(async () => {
      const res = await deleteTravelSlot(slot.id, withCheckins);
      if (res?.confirmCheckins) return setAskDelete({ checkins: res.confirmCheckins });
      setAskDelete(null);
      setDelState(res);
    });
  }

  if (editing) {
    return (
      <form action={action} className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <FlightFields slot={slot} />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
            Done
          </Button>
        </div>
        <Feedback state={state} />
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {slot.label}
            {slot.flightNo ? <span className="font-normal text-muted-foreground"> · {slot.flightNo}</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {slot.departureText} · {slot.students} student{slot.students === 1 ? "" : "s"}
          </p>
        </div>
        <Button size="icon-sm" variant="outline" onClick={() => setEditing(true)} aria-label={`Edit ${slot.label}`}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={deleting || askDelete !== null}
          aria-label={`Delete ${slot.label}`}
          onClick={() => {
            setDelState(undefined);
            setAskDelete({ checkins: 0 });
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {askDelete &&
        (askDelete.checkins === 0 ? (
          <InlineConfirm
            message={`Delete ${slot.label}? Its ${slot.students} student${slot.students === 1 ? "" : "s"} go back to “not assigned”.`}
            confirmLabel="Delete flight"
            pending={deleting}
            onConfirm={() => runDelete(false)}
            onCancel={() => setAskDelete(null)}
          />
        ) : (
          <InlineConfirm
            message={`${slot.label} already has ${askDelete.checkins} check-in${askDelete.checkins === 1 ? "" : "s"}. Deleting the flight also deletes ${
              askDelete.checkins === 1 ? "it" : "them"
            } — this can't be undone.`}
            confirmLabel={`Delete flight and ${askDelete.checkins} check-in${askDelete.checkins === 1 ? "" : "s"}`}
            pending={deleting}
            onConfirm={() => runDelete(true)}
            onCancel={() => setAskDelete(null)}
          />
        ))}
      <Feedback state={delState} />
    </div>
  );
}

// ---- allocation by cohort split ---------------------------------------------------------------

export type SplitRow = { split: string; total: number; slotId: string; bus: string; summary: string };

export function SplitAssignRow({ row, slots }: { row: SplitRow; slots: { id: string; label: string }[] }) {
  // Controlled + remounted (via key) from server data, so React 19's post-action form reset
  // can't snap the select back to a stale value (PROJECT_CONTEXT gotcha #7).
  const [slotId, setSlotId] = useState(row.slotId);
  const [bus, setBus] = useState(row.bus);
  const [state, action, pending] = useActionState<ActionState, FormData>(assignCohortSplit, undefined);

  return (
    <form action={action} className="grid grid-cols-[3.5rem_1fr] items-center gap-x-3 gap-y-1.5 border-b border-border py-2.5 last:border-0 sm:grid-cols-[3.5rem_9rem_1fr_6rem_auto]">
      <input type="hidden" name="split" value={row.split} />
      <span className="font-semibold">{row.split}</span>
      <span className="text-xs text-muted-foreground sm:text-sm">
        {row.total} students · <span className={cn(row.summary === "Not assigned" && "text-warning")}>{row.summary}</span>
      </span>
      <select name="slotId" value={slotId} onChange={(e) => setSlotId(e.target.value)} className={cn(inputCls, "col-span-2 sm:col-span-1")} aria-label={`Flight for ${row.split}`}>
        <option value="">Not assigned</option>
        {slots.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <input name="busNumber" value={bus} onChange={(e) => setBus(e.target.value)} placeholder="Bus" className={inputCls} aria-label={`Bus for ${row.split}`} />
      <Button type="submit" variant="outline" disabled={pending || row.total === 0}>
        {pending ? "…" : "Apply"}
      </Button>
      {state?.error && <p className="col-span-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function AssignmentsCsvUpload() {
  const [state, action, pending] = useActionState<ActionState, FormData>(importTravelAssignmentsCsv, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input name="file" type="file" accept=".csv" className="text-sm" aria-label="Allocation CSV" />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ClearAllAssignmentsButton({ count }: { count: number }) {
  const [state, setState] = useState<ActionState>(undefined);
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {asking ? (
        <InlineConfirm
          message={`Remove the flight/bus allocation for all ${count} students? Check-ins are kept.`}
          confirmLabel="Clear all allocations"
          pending={pending}
          onConfirm={() =>
            start(async () => {
              setState(await clearAllAssignments());
              setAsking(false);
            })
          }
          onCancel={() => setAsking(false)}
        />
      ) : (
        <Button
          variant="destructive"
          disabled={pending || count === 0}
          onClick={() => {
            setState(undefined);
            setAsking(true);
          }}
        >
          Clear all allocations
        </Button>
      )}
      <Feedback state={state} />
    </div>
  );
}

// ---- coordinators -----------------------------------------------------------------------------

export type CoordinatorRow = { id: string; name: string; isbEmail: string; checkpoint: string };

export function CoordinatorsPanel({
  coordinators,
  users,
  checkpoints,
}: {
  coordinators: CoordinatorRow[];
  users: { id: string; name: string; isbEmail: string }[];
  checkpoints: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(grantTravelCoordinator, undefined);
  const [removing, setRemoving] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {coordinators.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members yet. Admins can always open a check-in station.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {coordinators.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.checkpoint}</p>
              </div>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={removing === c.id}
                aria-label={`Remove ${c.name}`}
                onClick={() => {
                  setRemoving(c.id);
                  start(async () => {
                    await revokeTravelCoordinator(c.id);
                    setRemoving(null);
                  });
                }}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <form action={action} className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_auto]">
          <select name="userId" required defaultValue="" className={inputCls} aria-label="Roster member">
            <option value="" disabled>
              Add a coordinator from the roster…
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.isbEmail})
              </option>
            ))}
          </select>
          <select name="checkpointId" defaultValue="" className={inputCls} aria-label="Starting checkpoint">
            <option value="">Checkpoint: they choose</option>
            {checkpoints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add to travel team"}
          </Button>
        </div>
        <Feedback state={state} />
      </form>
    </div>
  );
}
