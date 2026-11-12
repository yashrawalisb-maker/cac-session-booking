"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Download, Plane, ScanLine, Settings2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABEL, TONE_CLASSES, fmtDeparture, fmtTime, toneFor } from "@/lib/travel-shared";
import { useTravel } from "./travel-data";
import { LiveDot, ProgressBar } from "./travel-ui";

export function TravelDashboard() {
  const { slots, students, scans, slotStats, studentById, checkpointById, slotById, scannerName } = useTravel();
  const unassigned = slotStats(null);
  const assignedCount = students.length - unassigned.total;

  const totals = useMemo(() => {
    const counts = { BUS: 0, AIRPORT: 0, GATE: 0 };
    for (const slot of slots) for (const stage of STAGES) counts[stage] += slotStats(slot.id).counts[stage];
    return counts;
  }, [slots, slotStats]);

  const feed = useMemo(() => [...scans].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).slice(0, 12), [scans]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Travel Log</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            Live check-ins for the Mohali → Hyderabad move · <LiveDot />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/travel/setup" />}>
            <Settings2 className="size-4" />
            Setup
          </Button>
          <Button nativeButton={false} render={<Link href="/travel/scan" />}>
            <ScanLine className="size-4" />
            Open scanner
          </Button>
        </div>
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Plane className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No flights added yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add flights and allocate students in Setup whenever the travel plan is final. Everything else works from there.
              </p>
            </div>
            <Button nativeButton={false} render={<Link href="/admin/travel/setup" />}>Go to Setup</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Total label="On a flight" value={`${assignedCount}/${students.length}`} />
            {STAGES.map((stage) => (
              <Total key={stage} label={`At ${STAGE_LABEL[stage].toLowerCase()}`} value={totals[stage]} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {slots.map((slot) => {
              const s = slotStats(slot.id);
              const tone = TONE_CLASSES[toneFor(s.pct)];
              return (
                <Link key={slot.id} href={`/admin/travel/flight/${slot.id}`} className="group">
                  <Card className={cn("h-full transition-shadow group-hover:shadow-md", s.total > 0 && `ring-2 ${tone.ring}`)}>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold tracking-tight">{slot.label}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {slot.flightNo ?? "Flight no. TBA"} · {fmtDeparture(slot.departureAt)}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.total ? tone.chip : "bg-muted text-muted-foreground")}>
                          {s.total ? `${Math.round(s.pct)}%` : "No students"}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">At {STAGE_LABEL[s.activeStage].toLowerCase()}</span>
                        <span className={cn("text-2xl font-semibold", s.total ? tone.text : "text-muted-foreground")}>
                          {s.done}
                          <span className="text-base font-normal text-muted-foreground"> / {s.total}</span>
                        </span>
                      </div>
                      <ProgressBar pct={s.pct} className={tone.bar} />
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        {STAGES.map((stage) => (
                          <div
                            key={stage}
                            className={cn("rounded-md py-1.5", stage === s.activeStage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                          >
                            {stage} {s.counts[stage]}/{s.total}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {unassigned.total > 0 && (
            <Link href="/admin/travel/flight/unassigned" className="group">
              <Card className="transition-shadow group-hover:shadow-md">
                <CardContent className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-warning-bg text-warning">
                    <UserX className="size-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{unassigned.total} students not on a flight yet</p>
                    <p className="text-sm text-muted-foreground">Allocate them in Setup once the travel plan is final.</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<a href="/admin/travel/export" />}>
              <Download className="size-4" />
              Export all (CSV)
            </Button>
            {slots.map((slot) => (
              <Button key={slot.id} variant="ghost" nativeButton={false} render={<a href={`/admin/travel/export?flight=${slot.id}`} />}>
                {slot.label} CSV
              </Button>
            ))}
          </div>

          <Card>
            <CardContent>
              <h2 className="mb-2 text-sm font-semibold">Latest check-ins</h2>
              {feed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No check-ins yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {feed.map((scan) => {
                    const st = studentById.get(scan.userId);
                    const cp = checkpointById.get(scan.checkpointId);
                    const by = scannerName(scan.scannedById);
                    return (
                      <li key={scan.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{st?.name ?? "Unknown student"}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {slotById.get(cp?.slotId ?? "")?.label} · {cp?.stage} · {scan.method === "manual" ? "manual" : "QR"}
                            {by ? ` · ${by}` : ""}
                            {scan.notes ? ` · “${scan.notes}”` : ""}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {fmtTime(scan.scannedAt)}
                          {scan.pending ? " ⏳" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Total({ label, value }: { label: string; value: string | number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
