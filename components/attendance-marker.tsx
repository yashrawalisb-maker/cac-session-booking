"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Check, X as XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markAttendance } from "@/app/attendance/actions";

export type AttendanceRow = {
  bookingId: string;
  name: string;
  isbEmail: string;
  section: string | null;
  attended: boolean | null;
};

export function AttendanceMarker({
  sessionId,
  rows,
}: {
  sessionId: string;
  rows: AttendanceRow[];
}) {
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
      (r) => r.name.toLowerCase().includes(q) || r.isbEmail.toLowerCase().includes(q)
    );
  }, [query, rows]);

  const presentCount = Object.values(state).filter((v) => v === true).length;

  function toggle(bookingId: string, attended: boolean) {
    const next = state[bookingId] === attended ? null : attended;
    setState((s) => ({ ...s, [bookingId]: next }));
    setPendingId(bookingId);
    startTransition(async () => {
      const res = await markAttendance(sessionId, bookingId, next ?? false);
      if (res.error) {
        // Revert on failure.
        setState((s) => ({ ...s, [bookingId]: state[bookingId] }));
      }
      setPendingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{presentCount}</span> of {rows.length}{" "}
          marked present
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</p>
        )}
        {filtered.map((r) => {
          const attended = state[r.bookingId];
          const busy = pendingId === r.bookingId;
          return (
            <div key={r.bookingId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {r.name}
                  {r.section && <span className="ml-1.5 text-xs text-muted-foreground">({r.section})</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.isbEmail}</p>
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
    </div>
  );
}
