import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { hasAttendanceAccess } from "@/lib/attendance";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

// Served from public/. Anyone with the link can open it directly — fine for a schedule.
const CALENDAR_URL = "/occ-calendar.pdf";

export default async function CalendarPage() {
  const user = await requireUser();
  const isAdmin = !!user.isAdmin;

  // The student shell needs the bell/attendance flags; the admin shell ignores them.
  const [unreadUpdates, showAttendanceTab] = isAdmin
    ? [false, false]
    : await Promise.all([hasUnreadAnnouncements(user.id!), hasAttendanceAccess(user.id!)]);

  return (
    <AppShell
      variant={isAdmin ? "admin" : "student"}
      userName={user.name ?? user.email ?? ""}
      userSubtitle={user.email ?? undefined}
      unreadUpdates={unreadUpdates}
      showAttendanceTab={showAttendanceTab}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">OCC Calendar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The full schedule for One Club Conclave 2026.
            </p>
          </div>
          <Button variant="outline" render={<a href={CALENDAR_URL} target="_blank" rel="noreferrer" />}>
            <ExternalLink className="size-4" />
            Open full-screen
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <object data={CALENDAR_URL} type="application/pdf" className="h-[80vh] w-full" aria-label="OCC Calendar">
            {/* Shown when the browser can't render the PDF inline (common on phones). */}
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Your browser can&apos;t preview the calendar here.
              </p>
              <Button render={<a href={CALENDAR_URL} target="_blank" rel="noreferrer" />}>
                Open the calendar
              </Button>
            </div>
          </object>
        </div>

        <p className="text-center text-xs text-muted-foreground sm:hidden">
          On a phone? Tap &ldquo;Open full-screen&rdquo; if the preview above doesn&apos;t load.
        </p>
      </div>
    </AppShell>
  );
}
