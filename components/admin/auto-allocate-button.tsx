"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AutoAllocationSummary } from "@/lib/autoAllocate";

export function AutoAllocateButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<AutoAllocationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/admin/events/${eventId}/auto-allocate`, { method: "POST" });
      if (!res.ok) {
        setError("Auto-allocation failed. Please try again.");
        return;
      }
      const data: AutoAllocationSummary = await res.json();
      setSummary(data);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Run auto-allocation</h3>
          <p className="text-xs text-muted-foreground">
            Randomly assigns eligible sessions to every user with unused tickets.
          </p>
        </div>
        <Button onClick={run} disabled={pending} variant="outline">
          {pending ? "Running…" : "Run auto-allocation"}
        </Button>
      </div>

      {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

      {summary && (
        <div className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">
          <p>
            Processed {summary.usersProcessed} user(s), created {summary.bookingsCreated} booking(s).
            {summary.usersFullyAllotted} fully allotted.
          </p>
          {summary.usersPartiallyAllotted.length > 0 && (
            <div className="mt-1 text-warning">
              <p className="font-medium">Needs follow-up:</p>
              <ul className="list-disc pl-5">
                {summary.usersPartiallyAllotted.map((u) => (
                  <li key={u.userId}>
                    {u.name} — {u.stillUnused} ticket(s) could not be allotted (no eligible sessions left)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
