import Link from "next/link";
import { Bus, Plane, QrCode } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { hasAttendanceAccess } from "@/lib/attendance";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { isTravelCoordinator, TRAVEL_STAGES } from "@/lib/travel";
import { fmtDeparture, fmtTime, STAGE_LABEL } from "@/lib/travel-shared";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StudentScanButton } from "@/components/travel/student-checkin";
import { cn } from "@/lib/utils";

/** Student travel card with "Scan to check in" (+ a shortcut to the check-in station for team members). */
export default async function TravelPage() {
  const user = await requireUser();

  const [me, assignment, scans, coordinator, unreadUpdates, showAttendanceTab] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id! }, select: { name: true, pgpId: true } }),
    prisma.travelAssignment.findUnique({ where: { userId: user.id! }, include: { slot: true } }),
    prisma.travelScan.findMany({ where: { userId: user.id! }, include: { checkpoint: true } }),
    isTravelCoordinator(user.id!),
    hasUnreadAnnouncements(user.id!),
    hasAttendanceAccess(user.id!),
  ]);
  const slot = assignment?.slot ?? null;
  const canScan = coordinator || !!user.isAdmin;
  const byStage = new Map(scans.map((s) => [s.checkpoint.stage, s]));

  return (
    <AppShell
      variant={user.isAdmin ? "admin" : "student"}
      userName={user.name ?? user.email ?? ""}
      userSubtitle={user.isAdmin ? "CAC Admin" : (user.email ?? undefined)}
      unreadUpdates={unreadUpdates}
      showAttendanceTab={showAttendanceTab}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Travel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mohali → Hyderabad</p>
        </div>

        {canScan && (
          <Card>
            <CardContent className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-navy-tint text-primary">
                <QrCode className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-medium">You&apos;re on the travel team</p>
                <p className="text-sm text-muted-foreground">Show your check-in QR at your checkpoint.</p>
              </div>
              <Button nativeButton={false} render={<Link href="/travel/station" />}>Open station</Button>
            </CardContent>
          </Card>
        )}

        {slot ? (
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your travel</p>
                  <p className="mt-1 text-lg font-semibold">{me?.name}</p>
                  <p className="text-sm text-muted-foreground">{me?.pgpId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <Plane className="mt-0.5 size-4 text-primary/70" />
                  <div>
                    <p className="font-medium">{slot.label}</p>
                    <p className="text-muted-foreground">
                      {slot.flightNo ?? "Flight no. TBA"} · {fmtDeparture(slot.departureAt?.toISOString())}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Bus className="mt-0.5 size-4 text-primary/70" />
                  <div>
                    <p className="font-medium">{assignment?.busNumber ?? "Bus TBA"}</p>
                    <p className="text-muted-foreground">From campus</p>
                  </div>
                </div>
              </div>
              <StudentScanButton />
              <p className="text-center text-xs text-muted-foreground">
                At the bus, airport check-in and boarding gate, scan the QR on a CAC team member&apos;s phone.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TRAVEL_STAGES.map((stage) => {
                  const scan = byStage.get(stage);
                  return (
                    <div
                      key={stage}
                      className={cn(
                        "rounded-lg px-2 py-2 text-center text-xs ring-1",
                        scan ? "bg-success-bg text-success ring-success/30" : "bg-muted text-muted-foreground ring-border",
                      )}
                    >
                      <div className="font-semibold">{STAGE_LABEL[stage]}</div>
                      <div>{scan ? `✓ ${fmtTime(scan.scannedAt.toISOString())}` : "Pending"}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Shown to everyone without a flight yet (team members included — they travel too).
          !user.isAdmin && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Plane className="size-6 text-muted-foreground" />
                </span>
                <div>
                  <p className="font-medium">You haven&apos;t been assigned to a flight yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {"Once CAC assigns your flight and bus, they'll show up here — along with the "}
                    <span className="font-medium text-foreground">Scan to check in</span>
                    {" button you'll use at the bus, airport and boarding gate."}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Status: Not assigned</span>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </AppShell>
  );
}
