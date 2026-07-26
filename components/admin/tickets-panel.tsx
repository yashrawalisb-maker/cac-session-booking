"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  setDefaultTickets,
  setTicketsBulk,
  importAllotmentsCsv,
  type ActionState,
} from "@/app/admin/events/[eventId]/actions";

export type TicketRow = {
  userId: string;
  name: string;
  isbEmail: string;
  ticketsAllotted: number;
  ticketsUsed: number;
};

export function TicketsPanel({ eventId, rows }: { eventId: string; rows: TicketRow[] }) {
  const [defaultState, defaultAction, defaultPending] = useActionState<ActionState, FormData>(
    setDefaultTickets.bind(null, eventId),
    undefined
  );
  const [csvState, csvAction, csvPending] = useActionState<ActionState, FormData>(
    importAllotmentsCsv.bind(null, eventId),
    undefined
  );
  const [bulkState, bulkAction, bulkPending] = useActionState<ActionState, FormData>(
    setTicketsBulk.bind(null, eventId),
    undefined
  );

  // Track which rows differ from their saved value so Save is only active when there's work.
  // Inputs stay uncontrolled (defaultValue) — this replaces 413 per-row action hooks with one.
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  // After a successful save the server-rendered defaults become the new baseline.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (bulkState?.success) setDirty(new Set());
  }, [bulkState]);

  const onCellChange = useCallback((userId: string, original: number, value: string) => {
    setDirty((prev) => {
      const changed = value.trim() === "" || Number(value) !== original;
      if (changed === prev.has(userId)) return prev;
      const next = new Set(prev);
      if (changed) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const dirtyCount = dirty.size;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Ticket allotment</h2>
        <Button
          type="submit"
          form="ticket-bulk-form"
          size="sm"
          disabled={bulkPending || dirtyCount === 0}
        >
          {bulkPending ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount > 1 ? "s" : ""}` : "Save changes"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end sm:justify-between">
        <form action={defaultAction} className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="tickets">
              Default tickets for all users
            </label>
            <Input id="tickets" name="tickets" type="number" min={0} defaultValue={2} className="w-24" />
          </div>
          <Button type="submit" disabled={defaultPending}>
            {defaultPending ? "Applying…" : "Apply to all"}
          </Button>
        </form>
        <form action={csvAction} className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="file">
              Import CSV (pgp_id, tickets_allotted)
            </label>
            <input id="file" name="file" type="file" accept=".csv" className="text-sm" />
          </div>
          <Button type="submit" variant="outline" disabled={csvPending}>
            {csvPending ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </div>

      {defaultState?.error && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {defaultState.error}
        </p>
      )}
      {defaultState?.message && (
        <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">{defaultState.message}</p>
      )}
      {csvState?.error && (
        <pre className="whitespace-pre-wrap rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {csvState.error}
        </pre>
      )}
      {csvState?.message && (
        <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">{csvState.message}</p>
      )}
      {bulkState?.error && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {bulkState.error}
        </p>
      )}
      {bulkState?.message && (
        <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">{bulkState.message}</p>
      )}

      <form id="ticket-bulk-form" ref={formRef} action={bulkAction}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Allotted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.userId} data-dirty={dirty.has(r.userId) || undefined}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.isbEmail}</TableCell>
                  <TableCell>{r.ticketsUsed}</TableCell>
                  <TableCell>
                    <Input
                      name={`tickets:${r.userId}`}
                      type="number"
                      min={0}
                      defaultValue={r.ticketsAllotted}
                      onChange={(e) => onCellChange(r.userId, r.ticketsAllotted, e.target.value)}
                      className="h-8 w-16 data-[dirty]:border-primary"
                      data-dirty={dirty.has(r.userId) || undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </form>
    </div>
  );
}
