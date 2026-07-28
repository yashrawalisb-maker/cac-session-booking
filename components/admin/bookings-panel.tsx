import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ManualBookingDialog } from "@/components/admin/manual-booking-dialog";
import { CancelBookingDialog } from "@/components/admin/cancel-booking-dialog";

const DT_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export type BookingRow = {
  id: string;
  userName: string;
  sessionTitle: string;
  track: string | null;
  bookingType: string;
  status: string;
  bookedAt: Date;
  adminNote: string | null;
};

export type ManualBookingSession = {
  id: string;
  title: string;
  dayLabel: string;
  capacity: number;
  bookedCount: number;
  club: string | null;
  tracks: { id: string; label: string; seatsRemaining: number }[];
};

export function BookingsPanel({
  eventId,
  bookings,
  users,
  sessions,
  cohortSplitCounts,
}: {
  eventId: string;
  bookings: BookingRow[];
  users: { id: string; name: string; isbEmail: string }[];
  sessions: ManualBookingSession[];
  cohortSplitCounts: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Bookings</h2>
        <div className="flex gap-2">
          <ManualBookingDialog
            eventId={eventId}
            users={users}
            sessions={sessions}
            cohortSplitCounts={cohortSplitCounts}
          />
          <Button variant="outline" render={<a href={`/admin/events/${eventId}/bookings/export`} />}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Track</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Booked at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.userName}</TableCell>
                <TableCell>{b.sessionTitle}</TableCell>
                <TableCell>
                  {b.track ? b.track : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={b.bookingType === "auto_allotted" ? "secondary" : "outline"}>
                    {b.bookingType === "auto_allotted" ? "Auto-assigned" : "Self-selected"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={b.status === "confirmed" ? "default" : "destructive"}>
                    {b.status === "confirmed" ? "Confirmed" : "Cancelled"}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{DT_FORMATTER.format(b.bookedAt)}</TableCell>
                <TableCell className="text-right">
                  {b.status === "confirmed" && <CancelBookingDialog eventId={eventId} bookingId={b.id} />}
                </TableCell>
              </TableRow>
            ))}
            {bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No bookings yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
