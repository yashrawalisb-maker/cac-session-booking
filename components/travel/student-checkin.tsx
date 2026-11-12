"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_LABEL, extractStationToken, fmtTime, type CheckinResponse } from "@/lib/travel-shared";
import { QrScanner } from "./qr-scanner";

type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "done"; res: CheckinResponse; token: string } | { kind: "not_station" };

async function postCheckin(token: string, confirmOtherFlight: boolean): Promise<CheckinResponse> {
  try {
    const res = await fetch("/api/travel/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, confirmOtherFlight }),
    });
    const body = (await res.json().catch(() => null)) as CheckinResponse | null;
    return body ?? { status: "error", message: `Something went wrong (${res.status}). Try again.` };
  } catch {
    return { status: "error", message: "No internet connection. Try again, or ask the team member to check you in manually." };
  }
}

/** Student's "Scan to check in" button + full-screen camera sheet. */
export function StudentScanButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const busy = useRef(false);

  async function submit(token: string, confirm = false) {
    setPhase({ kind: "sending" });
    const res = await postCheckin(token, confirm);
    navigator.vibrate?.(res.status === "ok" ? 120 : [60, 60, 60]);
    setPhase({ kind: "done", res, token });
    if (res.status === "ok") router.refresh();
  }

  function onScan(text: string) {
    if (busy.current) return;
    busy.current = true;
    const token = extractStationToken(text);
    if (!token) {
      navigator.vibrate?.([60, 60, 60]);
      setPhase({ kind: "not_station" });
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
            <span className="font-semibold">Scan the team member&apos;s QR</span>
            <button onClick={close} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-white/10">
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex-1">
            {phase.kind === "idle" || phase.kind === "sending" ? <QrScanner onScan={onScan} /> : null}
            {phase.kind === "sending" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">Checking you in…</div>
            )}
          </div>
          {(phase.kind === "done" || phase.kind === "not_station") && (
            <div className="rounded-t-2xl bg-card p-5 pb-8">
              <CheckinResult
                res={phase.kind === "done" ? phase.res : { status: "invalid" }}
                onConfirm={phase.kind === "done" ? () => void submit(phase.token, true) : undefined}
                onScanAgain={scanAgain}
                onDone={close}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Landing page for a station QR opened with the phone's normal camera (…/travel/checkin?t=…). */
export function CheckinLanding({ token }: { token: string | null }) {
  const router = useRouter();
  const [res, setRes] = useState<CheckinResponse | null>(token ? null : { status: "invalid" });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    postCheckin(token, false).then((r) => !cancelled && setRes(r));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!res) return <p className="py-10 text-center text-sm text-muted-foreground">Checking you in…</p>;
  return (
    <CheckinResult
      res={res}
      onConfirm={token ? () => postCheckin(token, true).then(setRes) : undefined}
      onScanAgain={() => router.push("/travel")}
      onDone={() => router.push("/travel")}
      scanAgainLabel="Back to Travel"
    />
  );
}

function CheckinResult({
  res,
  onConfirm,
  onScanAgain,
  onDone,
  scanAgainLabel = "Scan again",
}: {
  res: CheckinResponse;
  onConfirm?: () => void;
  onScanAgain: () => void;
  onDone: () => void;
  scanAgainLabel?: string;
}) {
  if (res.status === "ok") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-success-bg p-4 text-success">
          <div className="text-lg font-bold">✓ {res.already ? "Already checked in" : "Checked in"} at {STAGE_LABEL[res.stage]}</div>
          <div className="mt-1 text-sm">
            {res.flight} · with {res.memberName} · {fmtTime(res.scannedAt)}
          </div>
        </div>
        <Button className="h-11 w-full" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }
  if (res.status === "confirm_other_flight") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-warning-bg p-4 text-sm text-warning ring-2 ring-warning/40">
          <div className="font-semibold">⚠ Different flight</div>
          This QR is for <b>{res.thisFlight}</b> ({STAGE_LABEL[res.stage]}).{" "}
          {res.yourFlight ? (
            <>
              You&apos;re booked on <b>{res.yourFlight}</b>.
            </>
          ) : (
            <>You haven&apos;t been put on a flight yet.</>
          )}{" "}
          Only continue if CAC told you to travel on this flight.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-11" onClick={onScanAgain}>
            {scanAgainLabel}
          </Button>
          <Button className="h-11 bg-warning text-white hover:bg-warning/90" onClick={onConfirm}>
            Check in anyway
          </Button>
        </div>
      </div>
    );
  }
  const message =
    res.status === "expired"
      ? "That QR has expired. Ask the team member to show their screen again and rescan."
      : res.status === "invalid"
        ? "That isn't a CAC check-in QR. Scan the QR on the team member's phone."
        : res.message;
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-danger-bg p-4 text-sm text-danger">{message}</div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-11" onClick={onDone}>
          Close
        </Button>
        <Button className="h-11" onClick={onScanAgain}>
          {scanAgainLabel}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Still stuck? Any team member can check you in manually. <Link href="/travel" className="underline">Travel</Link>
      </p>
    </div>
  );
}
