import { createHmac, timingSafeEqual } from "crypto";
import type { TravelStage } from "@/generated/prisma/client";

/**
 * Static check-in QR codes — exactly three, one per checkpoint (Mohali bus, Airport, Hyderabad bus),
 * the same for every flight. A scan checks the student in at THEIR OWN flight's checkpoint.
 *
 * The token is the stage plus an HMAC signed with AUTH_SECRET, so a student can't fake the
 * Hyderabad-bus check-in by editing a link. It never expires, so printed QRs keep working —
 * but rotating AUTH_SECRET would invalidate them (reprint from Travel → QR codes).
 */

const PREFIX = "GSBS1";
const STAGES: readonly TravelStage[] = ["BUS", "AIRPORT", "GATE"];

function sign(stage: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`travel-stage-qr:${stage}`).digest("base64url").slice(0, 16);
}

export function makeStageToken(stage: TravelStage): string {
  return `${PREFIX}.${stage}.${sign(stage)}`;
}

/** The stage a scanned token stands for, or null if it isn't a genuine check-in QR. */
export function readStageToken(token: string): TravelStage | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const stage = parts[1] as TravelStage;
  if (!STAGES.includes(stage)) return null;
  const expected = Buffer.from(sign(stage));
  const given = Buffer.from(parts[2]);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return stage;
}

/** The URL each QR encodes: opens the check-in page (works from the in-app scanner or the phone camera). */
export function stageCheckinUrls(origin: string): Record<TravelStage, string> {
  const url = (stage: TravelStage) => `${origin}/travel/checkin?t=${encodeURIComponent(makeStageToken(stage))}`;
  return { BUS: url("BUS"), AIRPORT: url("AIRPORT"), GATE: url("GATE") };
}

/** Origin of the current request (so QRs printed from the live site point at the live site). */
export function requestOrigin(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
