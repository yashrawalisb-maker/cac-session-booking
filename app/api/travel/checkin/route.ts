import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { upsertTravelScan } from "@/lib/travel";
import { readStageToken } from "@/lib/travel-token";
import type { CheckinResponse } from "@/lib/travel-shared";

export const dynamic = "force-dynamic";

const reply = (body: CheckinResponse, status = 200) => Response.json(body, { status });

/**
 * A student checks themselves in by scanning one of the three static checkpoint QRs
 * (Mohali bus, Airport, Hyderabad bus). The check-in is recorded at that checkpoint of the
 * STUDENT'S OWN flight. Students not on a flight yet are told to see a team member.
 */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return reply({ status: "error", message: "Please sign in again." }, 401);

  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const stage = readStageToken(String(body?.token ?? ""));
  if (!stage) return reply({ status: "invalid" }, 400);

  const assignment = await prisma.travelAssignment.findUnique({ where: { userId: user.id }, include: { slot: true } });
  const slot = assignment?.slot ?? null;
  if (!slot) return reply({ status: "no_flight", stage }, 409);

  const checkpoint = await prisma.travelCheckpoint.findUnique({ where: { slotId_stage: { slotId: slot.id, stage } } });
  if (!checkpoint) return reply({ status: "error", message: "Your flight's check-in points aren't set up. Ask a CAC team member." }, 422);

  const { row, existed } = await upsertTravelScan({
    userId: user.id,
    checkpointId: checkpoint.id,
    scannedById: null, // self check-in via the static QR
    scannedAt: new Date(),
    method: "qr",
    notes: null,
  });

  return reply({ status: "ok", stage, flight: slot.label, scannedAt: row.scannedAt.toISOString(), already: existed });
}
