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
import { CLUBS } from "@/lib/clubs";
import { toIstDateTimeLocal } from "@/lib/time";
import type { SessionSpeaker } from "@/lib/speakers";

export type SessionDefaults = {
  title: string;
  description: string;
  dayLabel: string;
  startsAt: Date;
  endsAt: Date;
  venueName: string;
  venueLocation: string;
  capacity: number;
  speakers: SessionSpeaker[];
  venueDescription: string;
  venuePhotoUrl: string;
  venueMapUrl: string;
  campus: string;
  eventType: string;
  club: string;
  keyTakeaways: string;
  agenda: string;
  whoShouldAttend: string;
};

type SpeakerDraft = { name: string; role: string; photoUrl: string; bio: string; profileUrl: string };

function emptySpeaker(): SpeakerDraft {
  return { name: "", role: "", photoUrl: "", bio: "", profileUrl: "" };
}

function toDraft(s: SessionSpeaker): SpeakerDraft {
  return {
    name: s.name ?? "",
    role: s.role ?? "",
    photoUrl: s.photoUrl ?? "",
    bio: s.bio ?? "",
    profileUrl: s.profileUrl ?? "",
  };
}

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

  const [speakers, setSpeakers] = useState<SpeakerDraft[]>(() =>
    defaults?.speakers?.length ? defaults.speakers.map(toDraft) : [emptySpeaker()]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setOpen(false);
  }, [state]);

  function updateSpeaker(index: number, field: keyof SpeakerDraft, value: string) {
    setSpeakers((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }
  function addSpeaker() {
    setSpeakers((prev) => [...prev, emptySpeaker()]);
  }
  function removeSpeaker(index: number) {
    setSpeakers((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  // Only speakers with a name are submitted; the server trims/normalizes the rest.
  const serializedSpeakers = JSON.stringify(
    speakers
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        role: s.role.trim(),
        photoUrl: s.photoUrl.trim(),
        bio: s.bio.trim(),
        profileUrl: s.profileUrl.trim(),
      }))
  );

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
                defaultValue={defaults ? toIstDateTimeLocal(defaults.startsAt) : undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endsAt">Ends at</Label>
              <Input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={defaults ? toIstDateTimeLocal(defaults.endsAt) : undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eventType">Event type</Label>
              <Input id="eventType" name="eventType" placeholder="Masterclass, Panel, Workshop…" defaultValue={defaults?.eventType} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="club">Club</Label>
              <select
                id="club"
                name="club"
                defaultValue={defaults?.club ?? ""}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">— Select club —</option>
                {CLUBS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
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

          <div className="col-span-2 flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Speakers
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addSpeaker}>
                Add speaker
              </Button>
            </div>

            {speakers.map((sp, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Speaker {i + 1}</span>
                  {speakers.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSpeaker(i)}>
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`speaker-${i}-name`}>Name</Label>
                    <Input
                      id={`speaker-${i}-name`}
                      value={sp.name}
                      onChange={(e) => updateSpeaker(i, "name", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`speaker-${i}-role`}>Role / title</Label>
                    <Input
                      id={`speaker-${i}-role`}
                      placeholder="Director, Avendus"
                      value={sp.role}
                      onChange={(e) => updateSpeaker(i, "role", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor={`speaker-${i}-photoUrl`}>Photo URL</Label>
                    <Input
                      id={`speaker-${i}-photoUrl`}
                      type="url"
                      placeholder="https://…"
                      value={sp.photoUrl}
                      onChange={(e) => updateSpeaker(i, "photoUrl", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor={`speaker-${i}-bio`}>Bio</Label>
                    <Textarea
                      id={`speaker-${i}-bio`}
                      rows={3}
                      value={sp.bio}
                      onChange={(e) => updateSpeaker(i, "bio", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor={`speaker-${i}-profileUrl`}>Full profile link</Label>
                    <Input
                      id={`speaker-${i}-profileUrl`}
                      type="url"
                      placeholder="https://linkedin.com/…"
                      value={sp.profileUrl}
                      onChange={(e) => updateSpeaker(i, "profileUrl", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <input type="hidden" name="speakers" value={serializedSpeakers} />
          </div>

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
