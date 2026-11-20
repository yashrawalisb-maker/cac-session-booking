"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_LABEL, extractCheckinToken, fmtTime, type CheckinResponse } from "@/lib/travel-shared";
import { QrScanner } from "./qr-scanner";

type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "done"; res: CheckinResponse };

async function postCheckin(token: string): Promise<CheckinResponse> {
  try {
    const res = await fetch("/api/travel/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = (await res.json().catch(() => null)) as CheckinResponse | null;
    return body ?? { status: "error", message: `Something went wrong (${res.status}). Try again.` };
  } catch {
    return { status: "error", message: "No internet connection. Try again, or ask a CAC team member to check you in." };
  }
}

/** Student's "Scan to check in" button + full-screen camera sheet. */
export function StudentScanButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const busy = useRef(false);

  async function submit(token: string) {
    setPhase({ kind: "sending" });
    const res = await postCheckin(token);
    navigator.vibrate?.(res.status === "ok" ? 120 : [60, 60, 60]);
    setPhase({ kind: "done", res });
    if (res.status === "ok") router.refresh();
  }

  function onScan(text: string) {
    if (busy.current) return;
    busy.current = true;
    const token = extractCheckinToken(text);
    if (!token) {
      navigator.vibrate?.([60, 60, 60]);
      setPhase({ kind: "done", res: { status: "invalid" } });
      return;
    }
    void submit(token);
  }

  function scanAgain() {
    busy.current = false;
    setPhase({ kind: "idle" });
  }

  function close() {
    busy.current = false;
    setPhase({ kind: "idle" });
    setOpen(false);
  }

  return (
    <>
      <Button className="h-12 w-full text-base" onClick={() => setOpen(true)}>
        <ScanLine className="size-5" /> Scan to check in
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="font-semibold">Scan the check-in QR</span>
            <button onClick={close} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-white/10">
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex-1">
            {phase.kind !== "done" ? <QrScanner onScan={onScan} /> : null}
            {phase.kind === "sending" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">Checking you in…</div>
            )}
          </div>
          {phase.kind === "done" && (
            <div className="rounded-t-2xl bg-card p-5 pb-8">
              <CheckinResult res={phase.res} onScanAgain={scanAgain} onDone={close} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Landing page for a check-in QR opened with the phone's normal camera (…/travel/checkin?t=…). */
export function CheckinLanding({ token }: { token: string | null }) {
  const router = useRouter();
  const [res, setRes] = useState<CheckinResponse | null>(token ? null : { status: "invalid" });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    postCheckin(token).then((r) => !cancelled && setRes(r));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!res) return <p className="py-10 text-center text-sm text-muted-foreground">Checking you in…</p>;
  return (
    <CheckinResult res={res} onScanAgain={() => router.push("/travel")} onDone={() => router.push("/travel")} scanAgainLabel="Back to Travel" />
  );
}

function CheckinResult({
  res,
  onScanAgain,
  onDone,
  scanAgainLabel = "Scan again",
}: {
  res: CheckinResponse;
  onScanAgain: () => void;
  onDone: () => void;
  scanAgainLabel?: string;
}) {
  if (res.status === "ok") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-success-bg p-4 text-success">
          <div className="text-lg font-bold">{`✓ ${res.already ? "Already checked in" : "Checked in"} — ${STAGE_LABEL[res.stage]}`}</div>
          <div className="mt-1 text-sm">{`${res.flight} · ${fmtTime(res.scannedAt)}`}</div>
        </div>
        <Button className="h-11 w-full" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }
  const message =
    res.status === "no_flight"
      ? `You haven't been assigned to a flight yet, so your ${STAGE_LABEL[res.stage]} check-in can't be recorded. Please ask a CAC team member to check you in.`
      : res.status === "invalid"
        ? "That isn't a CAC check-in QR. Scan the Mohali bus, Airport or Hyderabad bus QR."
        : res.message;
  return (
    <div className="space-y-4">
      <div className={res.status === "no_flight" ? "rounded-xl bg-warning-bg p-4 text-sm text-warning" : "rounded-xl bg-danger-bg p-4 text-sm text-danger"}>
        {message}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-11" onClick={onDone}>
          Close
        </Button>
        <Button className="h-11" onClick={onScanAgain}>
          {scanAgainLabel}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Still stuck? Any CAC team member can check you in manually. <Link href="/travel" className="underline">Travel</Link>
      </p>
    </div>
  );
}
