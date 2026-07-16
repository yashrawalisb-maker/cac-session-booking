"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { importUsersCsv, type ActionState } from "@/app/admin/users/actions";

export function UsersCsvUpload() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    importUsersCsv,
    undefined
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="file">
            Import roster CSV (name, isb_email, pgp_id)
          </label>
          <input id="file" name="file" type="file" accept=".csv" className="text-sm" />
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
