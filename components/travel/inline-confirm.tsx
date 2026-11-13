"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * In-page "are you sure?" box. Used instead of window.confirm(), which some in-app browsers
 * (WhatsApp/LinkedIn webviews, embedded previews) silently block — confirm() then returns false and
 * the action never runs.
 */
export function InlineConfirm({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  pending = false,
  className,
}: {
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  className?: string;
}) {
  return (
    <div role="alertdialog" className={cn("flex flex-col gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm text-danger", className)}>
      <div>{message}</div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={onConfirm}>
          {pending ? "Working…" : confirmLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
