"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Megaphone, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type ActionState,
} from "@/app/admin/announcements/actions";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  eventId: string | null;
  eventName: string | null;
  createdAt: Date;
};

export type EventOption = { id: string; name: string };

function AnnouncementFormDialog({
  action,
  trigger,
  title,
  events,
  defaults,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  trigger: React.ReactNode;
  title: string;
  events: EventOption[];
  defaults?: { title: string; body: string; eventId: string | null };
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Global announcements reach every student; event-tagged ones reach only students
            holding tickets for that event.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input id="ann-title" name="title" required defaultValue={defaults?.title} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea id="ann-body" name="body" rows={4} required defaultValue={defaults?.body} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-event">Audience</Label>
            <select
              id="ann-event"
              name="eventId"
              defaultValue={defaults?.eventId ?? ""}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Everyone (global)</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  Ticket holders: {e.name}
                </option>
              ))}
            </select>
          </div>

          {state?.error && (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAnnouncementButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete announcement?</DialogTitle>
            <DialogDescription>
              “{title}” will disappear for everyone. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteAnnouncement(id);
                  setOpen(false);
                })
              }
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AnnouncementsPanel({
  announcements,
  events,
}: {
  announcements: AnnouncementRow[];
  events: EventOption[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Post updates for students — they appear on their Updates page.
          </p>
        </div>
        <AnnouncementFormDialog
          action={createAnnouncement}
          title="New announcement"
          events={events}
          trigger={
            <Button>
              <Megaphone className="size-4" />
              New announcement
            </Button>
          }
        />
      </div>

      {announcements.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No announcements yet. Post one to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <Badge variant="secondary">
                    {a.eventName ? a.eventName : "Everyone"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {DATE_FORMATTER.format(a.createdAt)}
                  </span>
                  <AnnouncementFormDialog
                    action={updateAnnouncement.bind(null, a.id)}
                    title="Edit announcement"
                    events={events}
                    defaults={{ title: a.title, body: a.body, eventId: a.eventId }}
                    trigger={
                      <Button size="sm" variant="outline">
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <DeleteAnnouncementButton id={a.id} title={a.title} />
                </div>
              </div>
              <p className="text-sm whitespace-pre-line text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
