import { createHmac, timingSafeEqual } from "crypto";

/**
 * Check-in station tokens. A team member's phone shows a QR holding a short-lived signed token for
 * (checkpoint, team member, issued-at). Students scan it to check themselves in. Tokens are signed
 * with AUTH_SECRET (no DB state) and expire after STATION_TOKEN_TTL_MS; the station refreshes the
 * QR every STATION_REFRESH_MS, so a forwarded photo/screenshot stops working within ~a minute.
 */

const PREFIX = "GSBT1";
export const STATION_TOKEN_TTL_MS = 90_000;
export const STATION_REFRESH_MS = 20_000;

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`travel-station:${payload}`).digest("base64url").slice(0, 22);
}

export function makeStationToken(checkpointId: string, memberId: string, now = Date.now()): string {
  const payload = `${checkpointId}.${memberId}.${Math.floor(now / 1000).toString(36)}`;
  return `${PREFIX}.${payload}.${sign(payload)}`;
}

export type StationTokenResult =
  | { ok: true; checkpointId: string; memberId: string; issuedAt: number }
  | { ok: false; reason: "invalid" | "expired" };

export function readStationToken(token: string, now = Date.now()): StationTokenResult {
  const parts = token.trim().split(".");
  if (parts.length !== 5 || parts[0] !== PREFIX) return { ok: false, reason: "invalid" };
  const [, checkpointId, memberId, issued36, sig] = parts;
  const expected = Buffer.from(sign(`${checkpointId}.${memberId}.${issued36}`));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "invalid" };
  const issuedAt = parseInt(issued36, 36) * 1000;
  if (!Number.isFinite(issuedAt) || issuedAt > now + 30_000) return { ok: false, reason: "invalid" };
  if (now - issuedAt > STATION_TOKEN_TTL_MS) return { ok: false, reason: "expired" };
  return { ok: true, checkpointId, memberId, issuedAt };
}
