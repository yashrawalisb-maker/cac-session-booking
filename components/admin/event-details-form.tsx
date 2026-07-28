"use client";

import { useActionState, useState } from "react";
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

  // Controlled fields, seeded once from the server defaults. React 19 auto-resets a form after a
  // function action completes, which strands *uncontrolled* fields on their (stale) defaultValue —
  // that's why picking Draft and saving snapped the Status select back to Published. Controlled
  // state survives that reset, and it already holds exactly what was submitted/saved.
  const [name, setName] = useState(defaults.name);
  const [status, setStatus] = useState(defaults.status);
  const [description, setDescription] = useState(defaults.description);
  const [startDate, setStartDate] = useState(toDateInputValue(defaults.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(defaults.endDate));
  const [bookingDeadline, setBookingDeadline] = useState(toIstDateTimeLocal(defaults.bookingDeadline));
  const [overlapCheckEnabled, setOverlapCheckEnabled] = useState(defaults.overlapCheckEnabled);

  return (
    // Dispatch the action from onSubmit rather than the `action` prop. React 19 auto-resets a
    // form whose `action` is a function once it completes, which resets the native <select> to its
    // first option (Draft) after every save — the reported "reverts to Published/Draft" bug. Going
    // through onSubmit keeps our controlled state as the single source of truth, no reset.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        formAction(new FormData(e.currentTarget));
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div className="col-span-full flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startDate">Start date</Label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="endDate">End date</Label>
        <Input
          id="endDate"
          name="endDate"
          type="date"
          required
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bookingDeadline">Booking deadline</Label>
        <Input
          id="bookingDeadline"
          name="bookingDeadline"
          type="datetime-local"
          required
          value={bookingDeadline}
          onChange={(e) => setBookingDeadline(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <Checkbox
          id="overlapCheckEnabled"
          name="overlapCheckEnabled"
          checked={overlapCheckEnabled}
          onCheckedChange={(checked) => setOverlapCheckEnabled(checked === true)}
        />
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
