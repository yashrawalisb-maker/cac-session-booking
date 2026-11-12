"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABEL, TONE_CLASSES, fmtTime, toneFor } from "@/lib/travel-shared";
import { useTravel } from "./travel-data";
import { LiveDot, ProgressBar, StageChips } from "./travel-ui";
import { QrScanner } from "./qr-scanner";
import { ManualCheckinDialog } from "./manual-checkin-dialog";

// QR codes carry the student's user id (a cuid). Accept the raw id or any text containing one.
const ID_RE = /\bc[a-z0-9]{20,32}\b/i;

type Result = { kind: "student"; id: string } | { kind: "unknown"; text: string };

export function TravelScanner() {
  const { me, slots, checkpoints, students, scans, studentById, slotById, checkpointById, stagesFor, slotStats, recordScan, setMyCheckpoint, refresh } =
    useTravel();

  const myCp = me?.checkpointId ? checkpointById.get(me.checkpointId) : undefined;
  const mySlot = myCp ? slotById.get(myCp.slotId) : undefined;

  const [result, setResult] = useState<Result | null>(null);
  const [armed, setArmed] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [manual, setManual] = useState<{ studentId?: string } | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);

  // The camera keeps running; refs let its callback see current state.
  const busyRef = useRef(false);
  const lookupRef = useRef(studentById);
  const lastRef = useRef({ text: "", at: 0 });
  useEffect(() => {
    busyRef.current = Boolean(result || manual);
  }, [result, manual]);
  useEffect(() => {
    lookupRef.current = studentById;
  }, [studentById]);
  // Restart the same-code cooldown when a card closes so the QR still in view isn't re-read instantly.
  useEffect(() => {
    if (!result) lastRef.current.at = Date.now();
  }, [result]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  function onScan(text: string) {
    if (busyRef.current) return;
    const now = Date.now();
    if (text === lastRef.current.text && now - lastRef.current.at < 4000) return;
    lastRef.current = { text, at: now };
    busyRef.current = true;
    const raw = text.trim();
    const id = lookupRef.current.has(raw) ? raw : raw.match(ID_RE)?.[0];
    const student = id ? lookupRef.current.get(id) : undefined;
    navigator.vibrate?.(student ? 60 : [60, 60, 60]);
    setArmed(false);
    setResult(student ? { kind: "student", id: student.id } : { kind: "unknown", text });
  }

  const dismiss = () => {
    setResult(null);
    setArmed(false);
  };

  const student = result?.kind === "student" ? studentById.get(result.id) : undefined;
  const studentSlot = student?.slotId ? slotById.get(student.slotId) : undefined;
  const wrongSlot = Boolean(student && myCp && student.slotId && student.slotId !== myCp.slotId);
  const unassigned = Boolean(student && !student.slotId);
  const alreadyHere = student && myCp ? scans.find((s) => s.userId === student.id && s.checkpointId === myCp.id) : undefined;

  function confirmCheckin() {
    if (!student || !myCp) return;
    if (wrongSlot && !armed) return setArmed(true); // one extra tap for a wrong-flight override
    recordScan({
      userId: student.id,
      checkpointId: myCp.id,
      method: "qr",
      notes: wrongSlot
        ? `Wrong-flight override (booked on ${studentSlot?.label ?? "another flight"})`
        : unassigned
          ? "No flight assigned at check-in"
          : null,
    });
    navigator.vibrate?.(120);
    setFlash(`✓ ${student.name} — ${STAGE_LABEL[myCp.stage]}`);
    dismiss();
  }

  const recent = useMemo(
    () =>
      scans
        .filter((s) => s.scannedById === me?.userId)
        .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt))
        .slice(0, 5),
    [scans, me],
  );

  const stats = mySlot ? slotStats(mySlot.id) : undefined;
  const pendingHere = myCp ? students.filter((s) => s.slotId === myCp.slotId && !stagesFor(s.id)[myCp.stage]) : [];
  const herePct = stats && myCp && stats.total ? (stats.counts[myCp.stage] / stats.total) * 100 : 0;

  async function changeCheckpoint(id: string) {
    setCpError(null);
    try {
      await setMyCheckpoint(id);
    } catch (e) {
      setCpError(`Couldn't switch checkpoint: ${(e as Error).message}`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            My checkpoint · <LiveDot />
          </div>
          <select
            value={myCp?.id ?? ""}
            onChange={(e) => changeCheckpoint(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-semibold"
            aria-label="My checkpoint"
          >
            {!myCp && <option value="">Choose your checkpoint…</option>}
            {slots.map((slot) => (
              <optgroup key={slot.id} label={`${slot.label}${slot.flightNo ? ` · ${slot.flightNo}` : ""}`}>
                {STAGES.map((stage) => {
                  const cp = checkpoints.find((c) => c.slotId === slot.id && c.stage === stage);
                  return cp ? (
                    <option key={cp.id} value={cp.id}>
                      {slot.label} · {stage}
                    </option>
                  ) : null;
                })}
              </optgroup>
            ))}
          </select>
        </div>
        <button
          onClick={() => setManual({})}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          <Keyboard className="size-4" /> Manual
        </button>
        <button onClick={() => void refresh()} className="flex size-10 items-center justify-center rounded-lg ring-1 ring-border" aria-label="Refresh data">
          <RefreshCw className="size-4" />
        </button>
      </div>
      {cpError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{cpError}</p>}

      <section className="relative aspect-square max-h-[58dvh] w-full overflow-hidden rounded-2xl bg-black">
        {slots.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-white/80">
            No flights have been set up yet. The admin adds them under Travel Log → Setup.
          </div>
        ) : (
          <>
            <QrScanner onScan={onScan} />
            {!myCp && (
              <div className="absolute inset-0 flex items-center justify-center bg-black p-8 text-center text-white">
                Pick your checkpoint above before scanning.
              </div>
            )}
          </>
        )}
        {flash && (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-success px-4 py-3 text-center font-semibold text-white shadow-lg">{flash}</div>
        )}
      </section>

      {result && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={dismiss}>
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {result.kind === "unknown" || !student ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-danger-bg p-4 text-danger">
                  <div className="font-semibold">Not a registered boarding pass</div>
                  <div className="mt-1 break-all text-xs opacity-80">{result.kind === "unknown" ? result.text.slice(0, 120) : ""}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={dismiss} className="rounded-xl py-3.5 font-semibold ring-1 ring-border">
                    Scan again
                  </button>
                  <button
                    onClick={() => {
                      dismiss();
                      setManual({});
                    }}
                    className="rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground"
                  >
                    Search manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold leading-tight">{student.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {student.pgpId} · {studentSlot?.label ?? "No flight yet"}
                    {studentSlot?.flightNo ? ` (${studentSlot.flightNo})` : ""} · {student.busNumber ?? "No bus"}
                  </div>
                </div>
                <StageChips stages={stagesFor(student.id)} highlight={myCp?.stage} />
                {wrongSlot && (
                  <div className="rounded-xl bg-warning-bg p-4 text-sm text-warning ring-2 ring-warning/40">
                    <div className="font-semibold">⚠ Wrong flight</div>
                    Booked on <b>{studentSlot?.label}</b>
                    {studentSlot?.flightNo ? ` (${studentSlot.flightNo})` : ""}, but you&apos;re checking in for <b>{mySlot?.label}</b>. Only continue if the
                    change is approved.
                  </div>
                )}
                {unassigned && <div className="rounded-xl bg-warning-bg p-3 text-sm text-warning">This student isn&apos;t on any flight yet.</div>}
                {alreadyHere && (
                  <p className="text-sm text-muted-foreground">Already checked in here at {fmtTime(alreadyHere.scannedAt)}. Confirming again updates the time.</p>
                )}
                <button
                  onClick={confirmCheckin}
                  disabled={!myCp}
                  className={cn(
                    "w-full rounded-xl py-4 text-lg font-bold text-white shadow-lg disabled:bg-muted-foreground/40",
                    wrongSlot ? "bg-warning" : "bg-success",
                  )}
                >
                  {!myCp ? "Pick a checkpoint first" : wrongSlot ? (armed ? "Tap again to confirm override" : "Check in anyway") : `Confirm check-in · ${myCp.stage}`}
                </button>
                <button onClick={dismiss} className="w-full py-1 text-sm font-medium text-muted-foreground">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your last 5 scans</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scanned yet.</p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {recent.map((s) => (
              <li key={s.id} className="min-w-36 shrink-0 rounded-lg bg-card px-3 py-2 ring-1 ring-border">
                <div className="truncate text-sm font-medium">{studentById.get(s.userId)?.name ?? "Unknown"}</div>
                <div className="text-xs text-muted-foreground">
                  {checkpointById.get(s.checkpointId)?.stage} · {fmtTime(s.scannedAt)} {s.pending ? "⏳" : "✓"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mySlot && stats && myCp && (
        <section className="rounded-xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">
              {mySlot.label} · {myCp.stage}
            </h2>
            <span className={cn("text-sm font-semibold", TONE_CLASSES[toneFor(herePct)].text)}>
              {stats.counts[myCp.stage]} / {stats.total}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar pct={herePct} className={TONE_CLASSES[toneFor(herePct)].bar} />
          </div>
          <div className="mt-3 grid grid-cols-3 text-center text-xs text-muted-foreground">
            {STAGES.map((stage) => (
              <div key={stage} className={cn(stage === myCp.stage && "font-semibold text-foreground")}>
                {stage} {stats.counts[stage]}/{stats.total}
              </div>
            ))}
          </div>
          {pendingHere.length > 0 && (
            <>
              <button onClick={() => setShowPending((v) => !v)} className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
                {showPending ? "Hide" : "Show"} {pendingHere.length} still pending
              </button>
              {showPending && (
                <ul className="mt-2 divide-y divide-border">
                  {pendingHere.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => setManual({ studentId: s.id })} className="w-full py-2 text-left text-sm">
                        <span className="font-medium">{s.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {s.pgpId} · {s.busNumber ?? "No bus"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {manual && (
        <ManualCheckinDialog onClose={() => setManual(null)} studentId={manual.studentId} defaultStage={myCp?.stage} defaultSlotId={myCp?.slotId} />
      )}
    </div>
  );
}
