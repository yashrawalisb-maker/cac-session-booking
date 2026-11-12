import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { COHORT_SPLITS } from "@/lib/cohortSplits";
import { toIstDateTimeLocal } from "@/lib/time";
import { fmtDeparture } from "@/lib/travel-shared";
import { Card, CardContent } from "@/components/ui/card";
import {
  AddFlightForm,
  AssignmentsCsvUpload,
  ClearAllAssignmentsButton,
  CoordinatorsPanel,
  FlightRow,
  SplitAssignRow,
  type SplitRow,
} from "@/components/travel/setup-forms";

export default async function TravelSetupPage() {
  await requireAdmin();

  const [slots, checkpoints, students, coordinators, roster] = await Promise.all([
    prisma.travelSlot.findMany({
      orderBy: [{ departureAt: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { assignments: true } } },
    }),
    prisma.travelCheckpoint.findMany({ include: { slot: true } }),
    prisma.user.findMany({
      where: { isAdmin: false },
      select: { cohortSplit: true, travelAssignment: { select: { slotId: true, busNumber: true } } },
    }),
    prisma.travelCoordinator.findMany({
      include: { user: true, checkpoint: { include: { slot: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.user.findMany({ select: { id: true, name: true, isbEmail: true }, orderBy: { name: "asc" } }),
  ]);

  const slotLabel = new Map(slots.map((s) => [s.id, s.label]));
  const stageOrder = { BUS: 0, AIRPORT: 1, GATE: 2 } as const;
  const checkpointOptions = checkpoints
    .sort((a, b) => slots.findIndex((s) => s.id === a.slotId) - slots.findIndex((s) => s.id === b.slotId) || stageOrder[a.stage] - stageOrder[b.stage])
    .map((c) => ({ id: c.id, label: `${c.slot.label} · ${c.stage}` }));

  // Per cohort split: how many students, and where they currently are (one flight, mixed, or none).
  const splitRows: SplitRow[] = COHORT_SPLITS.map((split) => {
    const members = students.filter((s) => s.cohortSplit === split);
    const bySlot = new Map<string, number>();
    const buses = new Set<string>();
    for (const m of members) {
      const key = m.travelAssignment?.slotId ?? "";
      bySlot.set(key, (bySlot.get(key) ?? 0) + 1);
      if (m.travelAssignment?.busNumber) buses.add(m.travelAssignment.busNumber);
    }
    const single = bySlot.size === 1 ? [...bySlot.keys()][0] : null;
    const summary =
      members.length === 0
        ? "—"
        : single === ""
          ? "Not assigned"
          : single
            ? `${slotLabel.get(single) ?? "?"}${buses.size === 1 ? ` · ${[...buses][0]}` : ""}`
            : "Mixed — " + [...bySlot.entries()].map(([k, n]) => `${n} ${k ? (slotLabel.get(k) ?? "?") : "unassigned"}`).join(", ");
    return { split, total: members.length, slotId: single ?? "", bus: buses.size === 1 ? [...buses][0] : "", summary };
  });

  const assignedCount = students.filter((s) => s.travelAssignment?.slotId).length;
  const noSplit = students.filter((s) => !s.cohortSplit).length;
  const coordinatorIds = new Set(coordinators.map((c) => c.userId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/travel" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Travel Log
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Travel setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill this in whenever the travel plan is ready — flights first, then who&apos;s on which flight and bus. Everything can be changed later.
        </p>
      </div>

      <Section n={1} title="Flights" hint="One card per flight on the dashboard.">
        <div className="flex flex-col gap-2">
          {slots.map((s) => (
            <FlightRow
              key={`${s.id}:${s.label}:${s.flightNo}:${s.departureAt?.toISOString()}`}
              slot={{
                id: s.id,
                label: s.label,
                flightNo: s.flightNo,
                departureLocal: s.departureAt ? toIstDateTimeLocal(s.departureAt) : "",
                departureText: fmtDeparture(s.departureAt?.toISOString()),
                students: s._count.assignments,
              }}
            />
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <AddFlightForm />
        </div>
      </Section>

      <Section
        n={2}
        title="Who's on which flight"
        hint={`${assignedCount} of ${students.length} students are on a flight.${noSplit ? ` ${noSplit} have no cohort split — use the CSV or the flight list for them.` : ""}`}
      >
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add at least one flight first.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold">By cohort split</h3>
              <p className="mb-1 text-xs text-muted-foreground">Puts every student in that split on the chosen flight and bus. Leave the bus blank if it isn&apos;t known yet.</p>
              {splitRows.map((row) => (
                <SplitAssignRow key={`${row.split}:${row.slotId}:${row.bus}:${row.summary}`} row={row} slots={slots.map((s) => ({ id: s.id, label: s.label }))} />
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold">Or upload a per-student list (CSV)</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Columns: <code className="rounded bg-muted px-1">pgp_id</code> (required), <code className="rounded bg-muted px-1">flight</code> (flight name or
                number; blank = not assigned), <code className="rounded bg-muted px-1">bus</code> (optional). Only students in the file are changed. If any row has
                a problem, nothing is imported.
              </p>
              <AssignmentsCsvUpload />
            </div>
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">Single changes (a late swap) — open the flight&apos;s list on the dashboard and tap the student.</p>
              <div className="max-w-xs">
                <ClearAllAssignmentsButton count={assignedCount} />
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section n={3} title="Scanner access" hint="Coordinators get a Travel tab with the QR scanner — they don't become admins.">
        <CoordinatorsPanel
          coordinators={coordinators.map((c) => ({
            id: c.id,
            name: c.user.name,
            isbEmail: c.user.isbEmail,
            checkpoint: c.checkpoint ? `${c.checkpoint.slot.label} · ${c.checkpoint.stage}` : "Chooses their checkpoint",
          }))}
          users={roster.filter((u) => !coordinatorIds.has(u.id))}
          checkpoints={checkpointOptions}
        />
      </Section>
    </div>
  );
}

function Section({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-navy-tint text-sm font-semibold text-primary">{n}</span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">{hint}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
