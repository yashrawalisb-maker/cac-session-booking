"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type BookableTrack = {
  id: string;
  label: string;
  speakerName: string | null;
  seatsRemaining: number;
};

/**
 * WIB add-to-plan flow: a WIB session runs several table tracks (each with its own seats), so the
 * student must pick exactly one track before it goes into their plan. This only captures the choice
 * — nothing is booked here; the batched Confirm-all commits it (with the chosen `sessionTrackId`).
 */
export function WibTrackPicker({
  tracks,
  disabled,
  disabledReason,
  onAdd,
}: {
  tracks: BookableTrack[];
  disabled?: boolean;
  disabledReason?: string;
  onAdd: (trackId: string, trackLabel: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  function add() {
    const track = tracks.find((t) => t.id === selected);
    if (!track) return;
    onAdd(track.id, track.label);
    setSelected("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="w-full" disabled={disabled} title={disabledReason}>
            Add to plan
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your table track</DialogTitle>
          <DialogDescription>
            This Women in Business session runs seven parallel tracks — pick the one you want to join.
            You can add only one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {tracks.map((t) => {
            const full = t.seatsRemaining <= 0;
            return (
              <label
                key={t.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                  full
                    ? "cursor-not-allowed border-border opacity-50"
                    : selected === t.id
                      ? "cursor-pointer border-primary bg-brand-navy-tint"
                      : "cursor-pointer border-border hover:border-primary/50"
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <input
                    type="radio"
                    name="wib-track"
                    value={t.id}
                    disabled={full}
                    checked={selected === t.id}
                    onChange={() => setSelected(t.id)}
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">{t.label}</span>
                    {t.speakerName && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.speakerName}
                      </span>
                    )}
                  </span>
                </span>
                <span className={cn("shrink-0 text-xs", full ? "text-danger" : "text-muted-foreground")}>
                  {full ? "Full" : `${t.seatsRemaining} left`}
                </span>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" onClick={add} disabled={!selected}>
            Add to plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
