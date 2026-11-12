"use client";

import { useEffect, useId, useRef, useState } from "react";

// html5-qrcode can't overlap start/stop transitions (React strict mode mounts
// twice in dev), so every camera operation runs through one promise chain.
let chain: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>) => {
  const p = chain.then(fn, fn);
  chain = p.catch(() => undefined);
  return p;
};

export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const rawId = useId();
  const elementId = `qr-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let disposed = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    serial(async () => {
      if (disposed) return;
      if (!window.isSecureContext) {
        throw new Error("Camera needs HTTPS. Open the app over https:// (or localhost).");
      }
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (disposed) return;
      scanner = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w, h) => {
            const size = Math.floor(Math.min(w, h) * 0.7);
            return { width: size, height: size };
          },
        },
        (text) => onScanRef.current(text),
        () => undefined,
      );
    })
      .then(() => !disposed && setStarting(false))
      .catch((e: unknown) => {
        if (disposed) return;
        const msg = String((e as Error)?.message ?? e);
        setError(
          /permission|notallowed/i.test(msg)
            ? "Camera permission was blocked. Allow camera access in your browser settings and reload."
            : /notfound|no camera|requested device/i.test(msg)
              ? "No camera found on this device."
              : msg,
        );
        setStarting(false);
      });

    return () => {
      disposed = true;
      serial(async () => {
        if (!scanner) return;
        try {
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        } catch {
          /* already stopped */
        }
      });
    };
  }, [elementId]);

  return (
    <div className="relative h-full w-full bg-black">
      <div id={elementId} className="qr-reader h-full w-full [&_video]:h-full! [&_video]:w-full! [&_video]:object-cover" />
      {starting && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Starting camera…</div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">{error}</div>
      )}
    </div>
  );
}
