"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TicketRowForm } from "@/components/admin/ticket-row-form";
import {
  setDefaultTickets,
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

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Ticket allotment</h2>

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
              <TableRow key={r.userId}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.isbEmail}</TableCell>
                <TableCell>{r.ticketsUsed}</TableCell>
                <TableCell>
                  <TicketRowForm eventId={eventId} userId={r.userId} ticketsAllotted={r.ticketsAllotted} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
