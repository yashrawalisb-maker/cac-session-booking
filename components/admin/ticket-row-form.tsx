"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setUserTickets, type ActionState } from "@/app/admin/events/[eventId]/actions";

export function TicketRowForm({
  eventId,
  userId,
  ticketsAllotted,
}: {
  eventId: string;
  userId: string;
  ticketsAllotted: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setUserTickets.bind(null, eventId, userId),
    undefined
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input
        name="tickets"
        type="number"
        min={0}
        defaultValue={ticketsAllotted}
        className="h-8 w-16"
      />
      <Button size="sm" variant="outline" type="submit" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
