import { prisma } from "@/lib/prisma";
import type { TravelStage } from "@/generated/prisma/client";
import type { TravelScanDTO, TravelSnapshot } from "@/lib/travel-shared";

export async function buildTravelSnapshot(viewer: { id: string; name: string; isAdmin: boolean }): Promise<TravelSnapshot> {
  const [slots, checkpoints, students, coordinators, admins, scans, me] = await Promise.all([
    prisma.travelSlot.findMany({ orderBy: [{ departureAt: "asc" }, { createdAt: "asc" }] }),
    prisma.travelCheckpoint.findMany(),
    prisma.user.findMany({
      where: { OR: [{ isAdmin: false }, { travelAssignment: { isNot: null } }] },
      select: {
        id: true,
        name: true,
        pgpId: true,
        isbEmail: true,
        cohortSplit: true,
        travelAssignment: { select: { slotId: true, busNumber: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.travelCoordinator.findMany({ select: { user: { select: { id: true, name: true } } } }),
    prisma.user.findMany({ where: { isAdmin: true }, select: { id: true, name: true } }),
    serializeScans(),
    prisma.travelCoordinator.findUnique({ where: { userId: viewer.id }, select: { checkpointId: true } }),
  ]);

  return {
    me: { userId: viewer.id, name: viewer.name, isAdmin: viewer.isAdmin, checkpointId: me?.checkpointId ?? null },
    slots: slots.map((s) => ({
      id: s.id,
      label: s.label,
      flightNo: s.flightNo,
      departureAt: s.departureAt?.toISOString() ?? null,
    })),
    checkpoints: checkpoints.map((c) => ({ id: c.id, slotId: c.slotId, stage: c.stage, label: c.label })),
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      pgpId: s.pgpId,
      isbEmail: s.isbEmail,
      cohortSplit: s.cohortSplit,
      slotId: s.travelAssignment?.slotId ?? null,
      busNumber: s.travelAssignment?.busNumber ?? null,
    })),
    scanners: [...admins, ...coordinators.map((c) => c.user)],
    scans,
  };
}

/**
 * Travel Log server helpers. Access model mirrors attendance tracking:
 *  - admins see and do everything;
 *  - TravelCoordinator rows grant a non-admin the scanner (not admin rights);
 *  - students see their own boarding pass once they're on a flight.
 */

export const TRAVEL_STAGES: TravelStage[] = ["BUS", "AIRPORT", "GATE"];

export const DEFAULT_CHECKPOINT_LABELS: Record<TravelStage, string> = {
  BUS: "Bus boarding",
  AIRPORT: "Airport check-in",
  GATE: "Gate boarding",
};

export async function serializeScans(): Promise<TravelScanDTO[]> {
  const scans = await prisma.travelScan.findMany({
    select: { id: true, userId: true, checkpointId: true, scannedById: true, scannedAt: true, method: true, notes: true },
  });
  return scans.map((s) => ({ ...s, scannedAt: s.scannedAt.toISOString() }));
}

export async function isTravelCoordinator(userId: string): Promise<boolean> {
  const row = await prisma.travelCoordinator.findUnique({ where: { userId }, select: { id: true } });
  return !!row;
}

/** Can this user use the scanner / see the live travel data? */
export async function canUseTravelScanner(user: { id?: string; isAdmin?: boolean }): Promise<boolean> {
  if (user.isAdmin) return true;
  if (!user.id) return false;
  return isTravelCoordinator(user.id);
}

/**
 * Drives the student sidebar "Travel" tab: coordinators always, students only once they've been
 * put on a flight — so nobody sees an empty tab before the allocation is entered.
 */
export async function hasTravelAccess(userId: string): Promise<boolean> {
  const [coordinator, assigned] = await Promise.all([
    prisma.travelCoordinator.count({ where: { userId } }),
    prisma.travelAssignment.count({ where: { userId, slotId: { not: null } } }),
  ]);
  return coordinator > 0 || assigned > 0;
}
