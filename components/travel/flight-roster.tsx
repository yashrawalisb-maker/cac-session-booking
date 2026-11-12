"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABEL, TONE_CLASSES, fmtDeparture, fmtTime, toneFor, type Stage } from "@/lib/travel-shared";
import { useTravel } from "./travel-data";
import { LiveDot, PipelineDots, ProgressBar } from "./travel-ui";
import { ManualCheckinDialog } from "./manual-checkin-dialog";

type StatusFilter = "ALL" | "PENDING" | "DONE";

/** One flight's student list (or the "not assigned" bucket): pending first, filters, manual check-in. */
export function FlightRoster({ slotId }: { slotId: string | null }) {
  const { slots, students, slotById, checkpointById, slotStats, stagesFor } = useTravel();
  const slot = slotId ? slotById.get(slotId) : undefined;
  const stats = slotStats(slot ? slot.id : null);
  const [stage, setStage] = useState<Stage | null>(null); // null → follow the flight's active stage
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const activeStage = stage ?? stats.activeStage;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => (slot ? s.slotId === slot.id : !s.slotId || !slotById.has(s.slotId)))
      .map((s) => ({ s, stages: stagesFor(s.id) }))
      .filter(({ s, stages }) => {
        if (q && ![s.name, s.pgpId, s.isbEmail, s.busNumber ?? "", s.cohortSplit ?? ""].some((v) => v.toLowerCase().includes(q))) return false;
        const done = Boolean(stages[activeStage]);
        return status === "ALL" || (status === "DONE" ? done : !done);
      })
      .sort((a, b) => Number(!!a.stages[activeStage]) - Number(!!b.stages[activeStage]) || a.s.name.localeCompare(b.s.name));
  }, [slot, slotById, students, stagesFor, query, status, activeStage]);

  if (slotId && !slot) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        That flight doesn&apos;t exist any more.{" "}
        <Link href="/admin/travel" className="underline">
          Back to Travel Log
        </Link>
      </p>
    );
  }

  const count = stats.counts[activeStage];
  const pct = stats.total ? (count / stats.total) * 100 : 0;
  const tone = TONE_CLASSES[toneFor(pct)];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin/travel" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Travel Log
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{slot ? slot.label : "Not on a flight yet"}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {slot ? `${slot.flightNo ?? "Flight no. TBA"} · ${fmtDeparture(slot.departureAt)}` : "Allocate these students in Setup."} · <LiveDot />
        </p>
      </div>

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {slots.map((s) => (
          <Link
            key={s.id}
            href={`/admin/travel/flight/${s.id}`}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1",
              s.id === slot?.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground",
            )}
          >
            {s.label}
          </Link>
        ))}
        <Link
          href="/admin/travel/flight/unassigned"
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1",
            !slot ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground",
          )}
        >
          Not assigned
        </Link>
      </nav>

      {slot && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">Checked in at {STAGE_LABEL[activeStage].toLowerCase()}</span>
              <span className={cn("text-xl font-semibold", tone.text)}>
                {count} / {stats.total}
              </span>
            </div>
            <ProgressBar pct={pct} className={tone.bar} />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/admin/travel/export?flight=${slot.id}`} />}>
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, PGP ID, email, bus or cohort split"
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-ring"
        />
        <div className="flex flex-wrap gap-2">
          <Segmented
            options={STAGES.map((s) => ({ value: s, label: `${s} ${stats.counts[s]}` }))}
            value={activeStage}
            onChange={(v) => setStage(v as Stage)}
          />
          <Segmented
            options={[
              { value: "ALL", label: "All" },
              { value: "PENDING", label: "Pending" },
              { value: "DONE", label: "Checked in" },
            ]}
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
          />
        </div>
      </div>

      <Card className="py-0">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No students match.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ s, stages }) => {
              const scan = stages[activeStage];
              return (
                <li key={s.id}>
                  <button onClick={() => setOpen(s.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60">
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate font-medium", !scan && slot && "text-danger")}>{s.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.pgpId} · {s.cohortSplit ?? "—"} · {s.busNumber ?? "No bus"}
                        {scan ? ` · ${activeStage} ${fmtTime(scan.scannedAt)}${scan.method === "manual" ? " (manual)" : ""}` : ""}
                        {scan?.notes ? ` · “${scan.notes}”` : ""}
                      </div>
                    </div>
                    <PipelineDots
                      stages={stages}
                      elsewhere={(st) => {
                        const sc = stages[st];
                        return Boolean(sc && checkpointById.get(sc.checkpointId)?.slotId !== s.slotId);
                      }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="pb-4 text-center text-xs text-muted-foreground">
        Dots: Bus · Airport · Gate. Amber = checked in on a different flight&apos;s checkpoint. Tap a student to check in, change flight/bus or clear a
        check-in.
      </p>

      {open && <ManualCheckinDialog onClose={() => setOpen(null)} studentId={open} defaultStage={activeStage} />}
    </div>
  );
}

function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg ring-1 ring-border">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn("px-3 py-1.5 text-sm font-medium", o.value === value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
