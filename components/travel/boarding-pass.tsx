"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** The student's QR (their user id) — rendered client-side, downloadable for offline use. */
export function BoardingPassQr({ userId, fileName }: { userId: string; fileName: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(userId, { width: 520, margin: 2, errorCorrectionLevel: "M" }).then((url) => alive && setSrc(url));
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex aspect-square w-full max-w-72 items-center justify-center rounded-xl bg-white p-2 ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
        {src ? <img src={src} alt="Your boarding QR code" className="h-full w-full" /> : <span className="text-sm text-muted-foreground">Loading…</span>}
      </div>
      {src && (
        <a href={src} download={fileName} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Save QR image (works without signal)
        </a>
      )}
    </div>
  );
}
