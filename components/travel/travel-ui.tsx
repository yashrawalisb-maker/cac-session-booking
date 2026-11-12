"use client";

import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABEL, fmtTime, type StageMap } from "@/lib/travel-shared";
import { useTravel } from "./travel-data";

/** Loading/error gate + offline/sync banner for every live Travel Log screen. */
export function TravelGate({ children }: { children: React.ReactNode }) {
  const { status, loadError, online, syncing, queueSize, notice, clearNotice } = useTravel();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading travel data…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-sm text-muted-foreground">
        <p>{loadError}</p>
        <button onClick={() => location.reload()} className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!online ? (
        <div className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm font-medium text-danger">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <span>
            Offline —{" "}
            {queueSize
              ? `${queueSize} check-in${queueSize > 1 ? "s" : ""} saved on this phone`
              : "check-ins will be saved on this phone"}{" "}
            and sync automatically when you&apos;re back online. Don&apos;t log out.
          </span>
        </div>
      ) : queueSize > 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-sm font-medium text-warning">
          <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
          {syncing ? "Syncing" : "Waiting to sync"} {queueSize} check-in{queueSize > 1 ? "s" : ""}…
        </div>
      ) : null}
      {notice && (
        <div className="flex items-start gap-3 rounded-lg bg-danger-bg px-3 py-2.5 text-sm text-danger">
          <span className="flex-1">{notice}</span>
          <button onClick={clearNotice} className="font-semibold">
            Dismiss
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

export function LiveDot() {
  const { live } = useTravel();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", live ? "bg-success" : "bg-muted-foreground/40")} />
      {live ? "Live" : "Not live"}
    </span>
  );
}

/** Bus · Airport · Gate as three dots: filled = checked in, hollow = pending. */
export function PipelineDots({ stages, elsewhere }: { stages: StageMap; elsewhere?: (s: keyof StageMap) => boolean }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Check-in progress">
      {STAGES.map((stage, i) => {
        const scan = stages[stage];
        const off = scan && elsewhere?.(stage);
        return (
          <div key={stage} className="flex items-center gap-1.5">
            {i > 0 && <span className={cn("h-0.5 w-2.5", scan ? "bg-success/60" : "bg-border")} />}
            <span
              title={`${STAGE_LABEL[stage]}${scan ? ` ✓ ${fmtTime(scan.scannedAt)}${scan.pending ? " (not synced yet)" : ""}` : " – pending"}`}
              className={cn(
                "size-3.5 rounded-full border-2",
                scan
                  ? off
                    ? "border-warning bg-warning"
                    : scan.pending
                      ? "border-success bg-success-bg"
                      : "border-success bg-success"
                  : "border-border bg-card",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

/** BUS ✓ 07:12 · AIRPORT – · GATE – tiles, with the current checkpoint outlined. */
export function StageChips({ stages, highlight }: { stages: StageMap; highlight?: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STAGES.map((stage) => {
        const scan = stages[stage];
        return (
          <div
            key={stage}
            className={cn(
              "rounded-lg px-2 py-2 text-center ring-1",
              scan ? "bg-success-bg text-success ring-success/30" : "bg-muted text-muted-foreground ring-border",
              highlight === stage && "outline-2 outline-offset-1 outline-primary",
            )}
          >
            <div className="text-[11px] font-semibold tracking-wide">{stage}</div>
            <div className="text-base font-semibold">{scan ? "✓" : "–"}</div>
            <div className="h-4 text-[11px]">{scan ? `${fmtTime(scan.scannedAt)}${scan.pending ? " ⏳" : ""}` : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar({ pct, className }: { pct: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all duration-500", className)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}
