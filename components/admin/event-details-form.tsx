"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { updateEvent, type ActionState } from "@/app/admin/events/[eventId]/actions";
import { toIstDateTimeLocal } from "@/lib/time";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function EventDetailsForm({
  eventId,
  defaults,
}: {
  eventId: string;
  defaults: {
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    bookingDeadline: Date;
    status: string;
    overlapCheckEnabled: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateEvent.bind(null, eventId),
    undefined
  );

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={defaults.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={defaults.status}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div className="col-span-full flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={defaults.description} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startDate">Start date</Label>
        <Input id="startDate" name="startDate" type="date" required defaultValue={toDateInputValue(defaults.startDate)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="endDate">End date</Label>
        <Input id="endDate" name="endDate" type="date" required defaultValue={toDateInputValue(defaults.endDate)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bookingDeadline">Booking deadline</Label>
        <Input
          id="bookingDeadline"
          name="bookingDeadline"
          type="datetime-local"
          required
          defaultValue={toIstDateTimeLocal(defaults.bookingDeadline)}
        />
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <Checkbox id="overlapCheckEnabled" name="overlapCheckEnabled" defaultChecked={defaults.overlapCheckEnabled} />
        <Label htmlFor="overlapCheckEnabled" className="font-normal">
          Prevent booking overlapping sessions
        </Label>
      </div>

      {state?.error && (
        <p role="alert" className="col-span-full rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="col-span-full">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save event"}
        </Button>
      </div>
    </form>
  );
}
