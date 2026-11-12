"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Keyboard, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABEL, TONE_CLASSES, fmtTime, toneFor } from "@/lib/travel-shared";
import { useTravel } from "./travel-data";
import { LiveDot, ProgressBar } from "./travel-ui";
import { ManualCheckinDialog } from "./manual-checkin-dialog";

/**
 * Team member's check-in station: shows a rotating QR for their checkpoint. Students scan it from
 * Travel → "Scan to check in" (or with the phone camera), which logs "<student> checked in with
 * <team member> at <stage>". Manual check-in stays available for dead phones / no internet.
 */
export function TravelStation() {
  const { me, slots, checkpoints, students, scans, studentById, slotById, checkpointById, stagesFor, slotStats, setMyCheckpoint, refresh } =
    useTravel();

  const myCp = me?.checkpointId ? checkpointById.get(me.checkpointId) : undefined;
  const mySlot = myCp ? slotById.get(myCp.slotId) : undefined;

  const [manual, setManual] = useState<{ studentId?: string } | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);

  // Everyone who checked in with me at this checkpoint, newest first.
  // (React Compiler memoizes this.)
  const mine =
    myCp && me
      ? scans.filter((s) => s.scannedById === me.userId && s.checkpointId === myCp.id).sort((a, b) => b.scannedAt.localeCompare(a.scannedAt))
      : [];

  // Flash a banner when a new check-in with me arrives (not for what was already there on open).
  const latestKey = mine[0] ? `${mine[0].id}:${mine[0].scannedAt}` : "";
  const [seen, setSeen] = useState({ cp: myCp?.id, key: latestKey });
  const [flash, setFlash] = useState<string | null>(null);
  if (seen.cp !== myCp?.id || seen.key !== latestKey) {
    setSeen({ cp: myCp?.id, key: latestKey });
    if (seen.cp === myCp?.id && mine[0]) setFlash(`✓ ${studentById.get(mine[0].userId)?.name ?? "Student"} checked in`);
  }
  useEffect(() => {
    if (!flash) return;
    navigator.vibrate?.(120);
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

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

      <section className="relative overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-border">
        {slots.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No flights have been set up yet. The admin adds them under Travel Log → Setup.</p>
        ) : !myCp || !mySlot ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Pick your checkpoint above to show your check-in QR.</p>
        ) : (
          <StationQr key={myCp.id} checkpointId={myCp.id} caption={`${mySlot.label} · ${STAGE_LABEL[myCp.stage]}`} />
        )}
        {flash && (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-success px-4 py-3 text-center font-semibold text-white shadow-lg">{flash}</div>
        )}
      </section>

      {myCp && (
        <section className="rounded-xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Checked in with me</h2>
            <span className="text-sm font-semibold">{mine.length}</span>
          </div>
          {mine.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nobody yet. Students scan your QR from Travel → Scan to check in.</p>
          ) : (
            <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto">
              {mine.map((s) => {
                const st = studentById.get(s.userId);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{st?.name ?? "Unknown student"}</div>
                      <div className={cn("truncate text-xs", s.notes ? "text-warning" : "text-muted-foreground")}>
                        {st?.pgpId}
                        {s.method === "manual" ? " · manual" : ""}
                        {s.notes ? ` · ${s.notes}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtTime(s.scannedAt)}
                      {s.pending ? " ⏳" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {mySlot && stats && myCp && (
        <section className="rounded-xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">
              {mySlot.label} · {myCp.stage} (everyone)
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

type StationState = { qr: string; expiresAt: number } | null;

/** The rotating QR: fetches a fresh signed token every ~20s and keeps the screen awake. */
function StationQr({ checkpointId, caption }: { checkpointId: string; caption: string }) {
  const [state, setState] = useState<StationState>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      let next = 20_000;
      try {
        const res = await fetch(`/api/travel/station?checkpointId=${encodeURIComponent(checkpointId)}`, { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as { token?: string; expiresAt?: string; refreshMs?: number; error?: string } | null;
        if (!res.ok || !body?.token || !body.expiresAt) throw new Error(body?.error ?? `HTTP ${res.status}`);
        const url = `${window.location.origin}/travel/checkin?t=${encodeURIComponent(body.token)}`;
        const qr = await QRCode.toDataURL(url, { margin: 1, width: 560, errorCorrectionLevel: "M" });
        if (cancelled) return;
        const expiresAt = new Date(body.expiresAt).getTime();
        setState({ qr, expiresAt });
        setExpired(false);
        setError(null);
        clearTimeout(expiry);
        expiry = setTimeout(() => !cancelled && setExpired(true), Math.max(0, expiresAt - Date.now()));
        next = body.refreshMs ?? next;
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        next = 5_000; // retry sooner while offline
      }
      timer = setTimeout(load, next);
    }
    void load();

    // Keep the screen on while the station is open (re-acquired when the tab becomes visible again).
    let lock: { release: () => Promise<void> } | null = null;
    const wake = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (wl && document.visibilityState === "visible") lock = await wl.request("screen");
      } catch {
        /* not supported / denied — fine */
      }
    };
    void wake();
    document.addEventListener("visibilitychange", wake);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(expiry);
      document.removeEventListener("visibilitychange", wake);
      void lock?.release().catch(() => undefined);
    };
  }, [checkpointId]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-square w-full max-w-sm">
        {state ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.qr} alt={`Check-in QR for ${caption}`} className={cn("h-full w-full", expired && "opacity-15")} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">{error ? "Can't load the QR." : "Loading QR…"}</div>
        )}
        {expired && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-danger">
            QR expired — no connection. Use Manual check-in until you&apos;re back online.
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900">{caption}</p>
        <p className="text-xs text-gray-500">Students scan this from Travel → Scan to check in. It refreshes automatically.</p>
      </div>
    </div>
  );
}
