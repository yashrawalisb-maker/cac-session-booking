"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionFormDialog } from "@/components/admin/session-form-dialog";
import { createSession, updateSession, cancelSession } from "@/app/admin/events/[eventId]/actions";
import { clubShort } from "@/lib/clubs";

const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  dayLabel: string;
  startsAt: Date;
  endsAt: Date;
  venueName: string;
  venueLocation: string | null;
  capacity: number;
  bookedCount: number;
  speakerProfileId: string | null;
  speakerDescription: string | null;
  status: string;
  speakerName: string | null;
  speakerRole: string | null;
  speakerPhotoUrl: string | null;
  speakerBio: string | null;
  speakerProfileUrl: string | null;
  venueDescription: string | null;
  venuePhotoUrl: string | null;
  venueMapUrl: string | null;
  campus: string | null;
  eventType: string | null;
  club: string | null;
  keyTakeaways: string | null;
  agenda: string | null;
  whoShouldAttend: string | null;
};

export function SessionsPanel({ eventId, sessions }: { eventId: string; sessions: SessionRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Sessions</h2>
        <SessionFormDialog
          action={createSession.bind(null, eventId)}
          title="Add session"
          trigger={<Button size="sm">Add session</Button>}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Club</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Booked</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell>
                  {s.club ? (
                    <Badge variant="secondary">{clubShort(s.club)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{s.dayLabel}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {TIME_FORMATTER.format(s.startsAt)}–{TIME_FORMATTER.format(s.endsAt)}
                </TableCell>
                <TableCell>{s.venueName}</TableCell>
                <TableCell>
                  {s.bookedCount}/{s.capacity}
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === "open" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"}>
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <SessionFormDialog
                      action={updateSession.bind(null, eventId, s.id)}
                      title="Edit session"
                      trigger={
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      }
                      defaults={{
                        title: s.title,
                        description: s.description ?? "",
                        dayLabel: s.dayLabel,
                        startsAt: s.startsAt,
                        endsAt: s.endsAt,
                        venueName: s.venueName,
                        venueLocation: s.venueLocation ?? "",
                        capacity: s.capacity,
                        speakerProfileId: s.speakerProfileId ?? "",
                        speakerDescription: s.speakerDescription ?? "",
                        speakerName: s.speakerName ?? "",
                        speakerRole: s.speakerRole ?? "",
                        speakerPhotoUrl: s.speakerPhotoUrl ?? "",
                        speakerBio: s.speakerBio ?? "",
                        speakerProfileUrl: s.speakerProfileUrl ?? "",
                        venueDescription: s.venueDescription ?? "",
                        venuePhotoUrl: s.venuePhotoUrl ?? "",
                        venueMapUrl: s.venueMapUrl ?? "",
                        campus: s.campus ?? "",
                        eventType: s.eventType ?? "",
                        club: s.club ?? "",
                        keyTakeaways: s.keyTakeaways ?? "",
                        agenda: s.agenda ?? "",
                        whoShouldAttend: s.whoShouldAttend ?? "",
                      }}
                    />
                    {s.status !== "cancelled" && (
                      <form action={cancelSession.bind(null, eventId, s.id)}>
                        <Button size="sm" variant="destructive" type="submit">
                          Cancel
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No sessions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
