"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionState } from "@/app/admin/events/[eventId]/actions";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type SessionDefaults = {
  title: string;
  description: string;
  dayLabel: string;
  startsAt: Date;
  endsAt: Date;
  venueName: string;
  venueLocation: string;
  capacity: number;
  speakerProfileId: string;
  speakerDescription: string;
};

export function SessionFormDialog({
  action,
  trigger,
  title,
  defaults,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  trigger: React.ReactNode;
  title: string;
  defaults?: SessionDefaults;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required defaultValue={defaults?.title} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={defaults?.description} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dayLabel">Day label</Label>
            <Input id="dayLabel" name="dayLabel" required placeholder="Day 1" defaultValue={defaults?.dayLabel} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              required
              defaultValue={defaults?.capacity}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startsAt">Starts at</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={defaults ? toLocalInputValue(defaults.startsAt) : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endsAt">Ends at</Label>
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              required
              defaultValue={defaults ? toLocalInputValue(defaults.endsAt) : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venueName">Venue name</Label>
            <Input id="venueName" name="venueName" required defaultValue={defaults?.venueName} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venueLocation">Venue location</Label>
            <Input id="venueLocation" name="venueLocation" defaultValue={defaults?.venueLocation} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="speakerProfileId">Speaker profile ID</Label>
            <Input id="speakerProfileId" name="speakerProfileId" defaultValue={defaults?.speakerProfileId} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="speakerDescription">Speaker description</Label>
            <Textarea
              id="speakerDescription"
              name="speakerDescription"
              rows={2}
              defaultValue={defaults?.speakerDescription}
            />
          </div>

          {state?.error && (
            <p role="alert" className="col-span-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <DialogFooter className="col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
