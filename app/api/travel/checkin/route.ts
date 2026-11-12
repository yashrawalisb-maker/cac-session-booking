import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canUseTravelScanner, upsertTravelScan } from "@/lib/travel";
import { readStationToken } from "@/lib/travel-token";
import type { CheckinResponse } from "@/lib/travel-shared";

export const dynamic = "force-dynamic";

const reply = (body: CheckinResponse, status = 200) => Response.json(body, { status });

/**
 * A student checks themselves in by scanning a team member's station QR.
 * The token proves which checkpoint and which team member (and that it's fresh). A checkpoint on a
 * different flight from the student's (or a student with no flight) needs `confirmOtherFlight`.
 */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return reply({ status: "error", message: "Please sign in again." }, 401);

  const body = (await req.json().catch(() => null)) as { token?: string; confirmOtherFlight?: boolean } | null;
  const parsed = readStationToken(String(body?.token ?? ""));
  if (!parsed.ok) {
    return parsed.reason === "expired"
      ? reply({ status: "expired" }, 410)
      : reply({ status: "invalid" }, 400);
  }

  const [member, checkpoint, assignment] = await Promise.all([
    prisma.user.findUnique({ where: { id: parsed.memberId }, select: { id: true, name: true, isAdmin: true } }),
    prisma.travelCheckpoint.findUnique({ where: { id: parsed.checkpointId }, include: { slot: true } }),
    prisma.travelAssignment.findUnique({ where: { userId: user.id }, include: { slot: true } }),
  ]);
  if (!checkpoint) return reply({ status: "error", message: "This checkpoint no longer exists." }, 422);
  if (!member || !(await canUseTravelScanner(member))) {
    return reply({ status: "error", message: "This team member can't check people in any more. Ask another team member." }, 403);
  }

  const myFlight = assignment?.slot ?? null;
  const otherFlight = !myFlight || myFlight.id !== checkpoint.slotId;
  if (otherFlight && !body?.confirmOtherFlight) {
    return reply(
      {
        status: "confirm_other_flight",
        stage: checkpoint.stage,
        thisFlight: checkpoint.slot.label,
        yourFlight: myFlight?.label ?? null,
        memberName: member.name,
      },
      409,
    );
  }

  const { row, existed } = await upsertTravelScan({
    userId: user.id,
    checkpointId: checkpoint.id,
    scannedById: member.id,
    scannedAt: new Date(),
    method: "qr",
    notes: otherFlight
      ? myFlight
        ? `Checked in on another flight's checkpoint (booked on ${myFlight.label})`
        : "No flight assigned at check-in"
      : null,
  });

  return reply({
    status: "ok",
    stage: checkpoint.stage,
    flight: checkpoint.slot.label,
    memberName: member.name,
    scannedAt: row.scannedAt.toISOString(),
    already: existed,
  });
}
