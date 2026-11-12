import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canUseTravelScanner, serializeScans, upsertTravelScan } from "@/lib/travel";

export const dynamic = "force-dynamic";

async function scanner() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { error: Response.json({ error: "Not signed in" }, { status: 401 }) };
  if (!(await canUseTravelScanner(user))) return { error: Response.json({ error: "No travel access" }, { status: 403 }) };
  return { user };
}

/** All scans — polled every few seconds by open dashboards/scanners. */
export async function GET() {
  const { error } = await scanner();
  if (error) return error;
  return Response.json({ scans: await serializeScans() });
}

/**
 * Team member records a check-in for a student (manual fallback). `scannedAt` is the time on the
 * team member's phone (it may sync late from the offline queue).
 */
export async function POST(req: Request) {
  const { user, error } = await scanner();
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    checkpointId?: string;
    method?: string;
    notes?: string | null;
    scannedAt?: string;
  } | null;
  if (!body?.userId || !body.checkpointId) return Response.json({ error: "userId and checkpointId are required" }, { status: 400 });
  const method = body.method === "manual" ? "manual" : "qr";
  const notes = body.notes?.trim() ? body.notes.trim().slice(0, 500) : null;

  let scannedAt = body.scannedAt ? new Date(body.scannedAt) : new Date();
  const now = Date.now();
  if (Number.isNaN(scannedAt.getTime()) || scannedAt.getTime() > now + 5 * 60_000) scannedAt = new Date(now); // bad phone clock

  const [student, checkpoint] = await Promise.all([
    prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } }),
    prisma.travelCheckpoint.findUnique({ where: { id: body.checkpointId }, select: { id: true } }),
  ]);
  if (!student) return Response.json({ error: "Unknown student" }, { status: 422 });
  if (!checkpoint) return Response.json({ error: "Unknown checkpoint" }, { status: 422 });

  const { row } = await upsertTravelScan({
    userId: body.userId,
    checkpointId: body.checkpointId,
    scannedById: user!.id!,
    scannedAt,
    method,
    notes,
  });
  return Response.json({
    scan: {
      id: row.id,
      userId: row.userId,
      checkpointId: row.checkpointId,
      scannedById: row.scannedById,
      scannedAt: row.scannedAt.toISOString(),
      method: row.method,
      notes: row.notes,
    },
  });
}

/** Admin-only: clear a check-in logged by mistake. */
export async function DELETE(req: Request) {
  const { user, error } = await scanner();
  if (error) return error;
  if (!user!.isAdmin) return Response.json({ error: "Only admins can clear a check-in" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { userId?: string; checkpointId?: string } | null;
  if (!body?.userId || !body.checkpointId) return Response.json({ error: "userId and checkpointId are required" }, { status: 400 });
  await prisma.travelScan.deleteMany({ where: { userId: body.userId, checkpointId: body.checkpointId } });
  return Response.json({ ok: true });
}
