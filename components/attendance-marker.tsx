"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Search, Check, X as XIcon, List, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSeatMap } from "@/lib/seatMap";
import { markAttendance } from "@/app/attendance/actions";

export type AttendanceRow = {
  bookingId: string;
  name: string;
  isbEmail: string;
  section: string | null;
  seatNumber: string | null;
  attended: boolean | null;
};

type ViewMode = "list" | "map";

export function AttendanceMarker({
  sessionId,
  rows,
}: {
  sessionId: string;
  rows: AttendanceRow[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<Record<string, boolean | null>>(() =>
    Object.fromEntries(rows.map((r) => [r.bookingId, r.attended]))
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.isbEmail.toLowerCase().includes(q) ||
        (r.seatNumber?.toLowerCase().includes(q) ?? false)
    );
  }, [query, rows]);

  const seatMap = useMemo(() => buildSeatMap(rows), [rows]);
  const rowByBookingId = useMemo(() => new Map(rows.map((r) => [r.bookingId, r])), [rows]);
  const matchedIds = useMemo(() => new Set(filtered.map((r) => r.bookingId)), [filtered]);
  const seatRefs = useRef(new Map<string, HTMLButtonElement>());

  // Jump the seat map to the first match as the tracker types, instead of making them hunt
  // through 270+ seats visually.
  useEffect(() => {
    if (viewMode !== "map" || !query.trim()) return;
    const q = query.trim().toLowerCase();
    const match = rows.find(
      (r) =>
        r.seatNumber &&
        (r.name.toLowerCase().includes(q) ||
          r.isbEmail.toLowerCase().includes(q) ||
          r.seatNumber.toLowerCase().includes(q))
    );
    if (match) {
      seatRefs.current.get(match.bookingId)?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [query, viewMode, rows]);

  const presentCount = Object.values(state).filter((v) => v === true).length;

  function setAttendance(bookingId: string, next: boolean | null) {
    const prev = state[bookingId];
    setState((s) => ({ ...s, [bookingId]: next }));
    setPendingId(bookingId);
    startTransition(async () => {
      const res = await markAttendance(sessionId, bookingId, next ?? false);
      if (res.error) {
        // Revert on failure.
        setState((s) => ({ ...s, [bookingId]: prev }));
      }
      setPendingId(null);
    });
  }

  function toggle(bookingId: string, attended: boolean) {
    setAttendance(bookingId, state[bookingId] === attended ? null : attended);
  }

  // Seat-map tap cycles a seat through the three states in one motion: not marked → present →
  // absent → not marked — since there's no room for separate Present/Absent buttons per seat.
  function cycleSeat(bookingId: string) {
    const current = state[bookingId];
    const next = current === true ? false : current === false ? null : true;
    setAttendance(bookingId, next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              viewMode === "list" ? "Search by name, email, or seat…" : "Find a seat or person…"
            }
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium",
                viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <List className="size-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={cn(
                "flex items-center gap-1.5 border-l border-border px-2.5 py-1.5 text-sm font-medium",
                viewMode === "map" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <LayoutGrid className="size-3.5" />
              Seat map
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{presentCount}</span> of {rows.length}{" "}
            marked present
          </p>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</p>
          )}
          {filtered.map((r) => {
            const attended = state[r.bookingId];
            const busy = pendingId === r.bookingId;
            return (
              <div key={r.bookingId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {r.seatNumber && (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-navy-tint text-sm font-semibold text-primary">
                      {r.seatNumber}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.name}
                      {r.section && <span className="ml-1.5 text-xs text-muted-foreground">({r.section})</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{r.isbEmail}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => toggle(r.bookingId, true)}
                    className={cn(attended === true && "border-success bg-success-bg text-success hover:bg-success-bg")}
                  >
                    <Check className="size-4" />
                    Present
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={attended === false ? "destructive" : "outline"}
                    disabled={busy}
                    onClick={() => toggle(r.bookingId, false)}
                  >
                    <XIcon className="size-4" />
                    Absent
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-2 sm:p-4">
          {seatMap.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No seat numbers to show yet — upload a seating chart for this session.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md">
                <div className="flex w-fit flex-col">
                  {seatMap.map((row, rowIndex) => {
                    const rowBg = rowIndex % 2 === 1 ? "bg-muted/40" : "bg-card";
                    return (
                    <div
                      key={row.label}
                      className={cn("flex items-center gap-1 rounded-sm px-1 py-0.5 sm:gap-1.5 sm:px-1.5", rowBg)}
                    >
                      <span
                        className={cn(
                          "sticky left-0 z-10 w-4 shrink-0 rounded-sm text-center text-[11px] font-bold text-foreground sm:w-5 sm:text-xs",
                          rowBg
                        )}
                      >
                        {row.label}
                      </span>
                      <div className="flex gap-1 sm:gap-1.5">
                        {row.cells.map((cell, i) => {
                          if (cell.type === "gap") {
                            return (
                              <span
                                key={i}
                                className="mx-0.5 w-px shrink-0 self-stretch bg-border sm:mx-1"
                                aria-hidden
                              />
                            );
                          }
                          const attended = state[cell.bookingId];
                          const busy = pendingId === cell.bookingId;
                          const name = rowByBookingId.get(cell.bookingId)?.name ?? "";
                          const dimmed = query.trim().length > 0 && !matchedIds.has(cell.bookingId);
                          const highlighted = query.trim().length > 0 && matchedIds.has(cell.bookingId);
                          return (
                            <button
                              key={cell.bookingId}
                              ref={(el) => {
                                if (el) seatRefs.current.set(cell.bookingId, el);
                                else seatRefs.current.delete(cell.bookingId);
                              }}
                              type="button"
                              disabled={busy}
                              onClick={() => cycleSeat(cell.bookingId)}
                              title={`${cell.seatNumber} — ${name}`}
                              className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-md border-2 text-[9px] font-bold transition-all disabled:opacity-50 sm:size-9 sm:text-[10px]",
                                attended === true && "border-success bg-success text-white shadow-sm",
                                attended === false && "border-danger bg-danger text-white shadow-sm",
                                attended == null &&
                                  "border-border bg-background text-foreground shadow-sm hover:border-primary/50 hover:bg-accent",
                                highlighted && "ring-2 ring-primary ring-offset-1",
                                dimmed && "opacity-30"
                              )}
                            >
                              {cell.seatNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-md bg-muted py-1.5 text-center text-xs font-medium tracking-wide text-muted-foreground">
                STAGE
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm border-2 border-border bg-background" /> Not marked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm border-2 border-success bg-success" /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm border-2 border-danger bg-danger" /> Absent
                </span>
                <span>Tap a seat to cycle: not marked → present → absent</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
