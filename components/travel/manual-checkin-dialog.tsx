"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { STAGES, STAGE_LABEL, fmtTime, type Stage } from "@/lib/travel-shared";
import { setStudentAssignment } from "@/app/admin/travel/actions";
import { useTravel } from "./travel-data";
import { StageChips } from "./travel-ui";

const inputCls = "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring";

export function ManualCheckinDialog({
  onClose,
  studentId: initialStudent,
  defaultStage,
  defaultSlotId,
}: {
  onClose: () => void;
  studentId?: string;
  defaultStage?: Stage;
  defaultSlotId?: string | null;
}) {
  const { students, slots, scans, studentById, slotById, checkpointFor, stagesFor, recordScan, undoScan, me, scannerName, refresh } =
    useTravel();
  const [studentId, setStudentId] = useState(initialStudent);
  const [query, setQuery] = useState("");
  const student = studentId ? studentById.get(studentId) : undefined;
  const [slotId, setSlotId] = useState<string | null>(student?.slotId ?? defaultSlotId ?? slots[0]?.id ?? null);
  const [stage, setStage] = useState<Stage>(defaultStage ?? "BUS");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isAdmin = !!me?.isAdmin;

  // admin-only: change this student's flight/bus
  const [editAssign, setEditAssign] = useState(false);
  const [assignSlot, setAssignSlot] = useState(student?.slotId ?? "");
  const [assignBus, setAssignBus] = useState(student?.busNumber ?? "");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => s.name.toLowerCase().includes(q) || s.pgpId.toLowerCase().includes(q) || s.isbEmail.toLowerCase().includes(q))
      .slice(0, 30);
  }, [query, students]);

  const checkpoint = checkpointFor(slotId, stage);
  const existing = student && checkpoint ? scans.find((s) => s.userId === student.id && s.checkpointId === checkpoint.id) : undefined;
  const wrongSlot = Boolean(student && slotId && student.slotId && student.slotId !== slotId);
  const unassigned = Boolean(student && !student.slotId);

  function pick(id: string) {
    const s = studentById.get(id);
    setStudentId(id);
    setSlotId(s?.slotId ?? slotId);
    setAssignSlot(s?.slotId ?? "");
    setAssignBus(s?.busNumber ?? "");
    setQuery("");
  }

  function save() {
    if (!student || !checkpoint) return;
    const auto = wrongSlot
      ? `Wrong-flight override (booked on ${slotById.get(student.slotId ?? "")?.label ?? "another flight"})`
      : unassigned
        ? "No flight assigned at check-in"
        : "";
    recordScan({ userId: student.id, checkpointId: checkpoint.id, method: "manual", notes: [auto, notes.trim()].filter(Boolean).join(" · ") || null });
    onClose();
  }

  function clear() {
    if (!student || !checkpoint || !confirm(`Clear ${STAGE_LABEL[stage]} check-in for ${student.name}?`)) return;
    setErr(null);
    startTransition(async () => {
      try {
        await undoScan(student.id, checkpoint.id);
        onClose();
      } catch (e) {
        setErr((e as Error).message || "Couldn't clear — are you online?");
      }
    });
  }

  function saveAssignment() {
    if (!student) return;
    setErr(null);
    startTransition(async () => {
      const res = await setStudentAssignment(student.id, assignSlot || null, assignBus || null);
      if (res?.error) return setErr(res.error);
      await refresh();
      setEditAssign(false);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Manual check-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Manual check-in</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        {student ? (
          <div className="mb-4 rounded-xl bg-muted/60 p-4 ring-1 ring-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{student.name}</div>
                <div className="text-sm text-muted-foreground">
                  {student.pgpId} · {student.cohortSplit ?? "—"} · {slotById.get(student.slotId ?? "")?.label ?? "No flight yet"} ·{" "}
                  {student.busNumber ?? "No bus"}
                </div>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                {isAdmin && (
                  <button onClick={() => setEditAssign((v) => !v)} className="font-medium text-primary underline-offset-4 hover:underline">
                    {editAssign ? "Cancel" : "Change flight/bus"}
                  </button>
                )}
                {!initialStudent && (
                  <button onClick={() => setStudentId(undefined)} className="text-muted-foreground underline-offset-4 hover:underline">
                    Change
                  </button>
                )}
              </div>
            </div>
            {editAssign && (
              <div className="mt-3 grid grid-cols-[1fr_7rem_auto] items-end gap-2">
                <select value={assignSlot} onChange={(e) => setAssignSlot(e.target.value)} className={inputCls} aria-label="Flight">
                  <option value="">Not assigned</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                      {s.flightNo ? ` · ${s.flightNo}` : ""}
                    </option>
                  ))}
                </select>
                <input value={assignBus} onChange={(e) => setAssignBus(e.target.value)} placeholder="Bus" className={inputCls} aria-label="Bus" />
                <Button size="lg" onClick={saveAssignment} disabled={pending}>
                  Save
                </Button>
              </div>
            )}
            <div className="mt-3">
              <StageChips stages={stagesFor(student.id)} highlight={stage} />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, PGP ID or email"
              className={inputCls}
            />
            {matches.length > 0 && (
              <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-lg ring-1 ring-border">
                {matches.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => pick(s.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted">
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{s.name}</span> <span className="text-muted-foreground">{s.pgpId}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{slotById.get(s.slotId ?? "")?.label ?? "No flight"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim() && matches.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No student matches “{query}”.</p>}
          </div>
        )}

        {slots.length === 0 ? (
          <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">Add a flight under Travel Log → Setup before checking anyone in.</p>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium">Flight</span>
              <select value={slotId ?? ""} onChange={(e) => setSlotId(e.target.value)} className={cn(inputCls, "mt-1")}>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {s.flightNo ? ` · ${s.flightNo}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="text-sm font-medium">Checkpoint</span>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    className={cn(
                      "rounded-lg py-2.5 text-sm font-semibold ring-1",
                      stage === s ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border hover:bg-muted",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {wrongSlot && student && (
              <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
                ⚠ {student.name} is booked on {slotById.get(student.slotId ?? "")?.label}. Saving logs them on {slotById.get(slotId ?? "")?.label} as an
                override.
              </p>
            )}
            {unassigned && <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">This student isn&apos;t on any flight yet.</p>}
            {existing && (
              <p className="text-sm text-muted-foreground">
                Already checked in here at {fmtTime(existing.scannedAt)}
                {scannerName(existing.scannedById) ? ` by ${scannerName(existing.scannedById)}` : ""}
                {existing.notes ? ` — “${existing.notes}”` : ""}. Saving again updates the time.
              </p>
            )}
            <label className="block">
              <span className="text-sm font-medium">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Phone dead, verified with ID card"
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button
              onClick={save}
              disabled={!student || !checkpoint}
              className={cn(
                "w-full rounded-xl py-3.5 text-base font-semibold text-white disabled:bg-muted-foreground/40",
                wrongSlot ? "bg-warning" : "bg-success",
              )}
            >
              {wrongSlot ? "Save override check-in" : `Save ${STAGE_LABEL[stage]} check-in`}
            </button>
            {isAdmin && existing && !existing.pending && (
              <button onClick={clear} disabled={pending} className="w-full py-2 text-sm font-medium text-danger">
                Clear this check-in
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
