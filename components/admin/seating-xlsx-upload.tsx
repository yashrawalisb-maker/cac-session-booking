"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { importSeatingXlsx, type ActionState } from "@/app/admin/users/actions";

export function SeatingXlsxUpload() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    importSeatingXlsx,
    undefined
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="seatingFile">
            Import seating chart (.xlsx) — matches existing users by PGID, updates seat number
          </label>
          <input id="seatingFile" name="file" type="file" accept=".xlsx" className="text-sm" />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>
      {state?.error && (
        <pre className="whitespace-pre-wrap rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </pre>
      )}
      {state?.message && (
        <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">{state.message}</p>
      )}
    </div>
  );
}
