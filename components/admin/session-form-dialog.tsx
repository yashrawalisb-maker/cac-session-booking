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
  speakerName: string;
  speakerRole: string;
  speakerPhotoUrl: string;
  speakerBio: string;
  speakerProfileUrl: string;
  venueDescription: string;
  venuePhotoUrl: string;
  venueMapUrl: string;
  campus: string;
  eventType: string;
  organizedBy: string;
  keyTakeaways: string;
  agenda: string;
  whoShouldAttend: string;
};

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="col-span-2 flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid grid-cols-2 gap-3">
          <FormSection title="Basics">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required defaultValue={defaults?.title} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="description">Short description</Label>
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
              <Label htmlFor="eventType">Event type</Label>
              <Input id="eventType" name="eventType" placeholder="Masterclass, Panel, Workshop…" defaultValue={defaults?.eventType} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organizedBy">Organized by</Label>
              <Input id="organizedBy" name="organizedBy" placeholder="Marketing Club, ISB" defaultValue={defaults?.organizedBy} />
            </div>
          </FormSection>

          <FormSection title="Venue">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="venueName">Venue name</Label>
              <Input id="venueName" name="venueName" required defaultValue={defaults?.venueName} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="venueLocation">Venue location</Label>
              <Input id="venueLocation" name="venueLocation" defaultValue={defaults?.venueLocation} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campus">Campus</Label>
              <Input id="campus" name="campus" placeholder="ISB Mohali" defaultValue={defaults?.campus} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="venueMapUrl">Map link</Label>
              <Input id="venueMapUrl" name="venueMapUrl" type="url" placeholder="https://maps.google.com/…" defaultValue={defaults?.venueMapUrl} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="venuePhotoUrl">Venue photo URL</Label>
              <Input id="venuePhotoUrl" name="venuePhotoUrl" type="url" placeholder="https://…" defaultValue={defaults?.venuePhotoUrl} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="venueDescription">Venue description</Label>
              <Textarea id="venueDescription" name="venueDescription" rows={2} defaultValue={defaults?.venueDescription} />
            </div>
          </FormSection>

          <FormSection title="Speaker">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="speakerName">Speaker name</Label>
              <Input id="speakerName" name="speakerName" defaultValue={defaults?.speakerName} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="speakerRole">Speaker role / title</Label>
              <Input id="speakerRole" name="speakerRole" placeholder="Marketing Leader & Strategist" defaultValue={defaults?.speakerRole} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="speakerPhotoUrl">Speaker photo URL</Label>
              <Input id="speakerPhotoUrl" name="speakerPhotoUrl" type="url" placeholder="https://…" defaultValue={defaults?.speakerPhotoUrl} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="speakerBio">Speaker bio</Label>
              <Textarea id="speakerBio" name="speakerBio" rows={3} defaultValue={defaults?.speakerBio} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="speakerProfileUrl">Full profile link</Label>
              <Input id="speakerProfileUrl" name="speakerProfileUrl" type="url" placeholder="https://linkedin.com/…" defaultValue={defaults?.speakerProfileUrl} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="speakerProfileId">Speaker profile ID</Label>
              <Input id="speakerProfileId" name="speakerProfileId" defaultValue={defaults?.speakerProfileId} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="speakerDescription">Speaker description (legacy, shown as fallback)</Label>
              <Textarea
                id="speakerDescription"
                name="speakerDescription"
                rows={2}
                defaultValue={defaults?.speakerDescription}
              />
            </div>
          </FormSection>

          <FormSection title="Detail page content">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="keyTakeaways">Key takeaways (one per line)</Label>
              <Textarea
                id="keyTakeaways"
                name="keyTakeaways"
                rows={3}
                placeholder={"Understand the core principles\nLearn from real-world case studies"}
                defaultValue={defaults?.keyTakeaways}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="agenda">Agenda</Label>
              <Textarea id="agenda" name="agenda" rows={3} defaultValue={defaults?.agenda} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="whoShouldAttend">Who should attend</Label>
              <Textarea id="whoShouldAttend" name="whoShouldAttend" rows={3} defaultValue={defaults?.whoShouldAttend} />
            </div>
          </FormSection>

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
