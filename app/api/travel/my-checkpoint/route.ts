import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** A coordinator switches where they're stationed (e.g. Day 1 bus → Day 2 gate). */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { checkpointId?: string | null } | null;
  const checkpointId = body?.checkpointId || null;
  if (checkpointId && !(await prisma.travelCheckpoint.findUnique({ where: { id: checkpointId }, select: { id: true } }))) {
    return Response.json({ error: "Unknown checkpoint" }, { status: 422 });
  }

  // Admins have no coordinator row — the client remembers their choice locally instead.
  const updated = await prisma.travelCoordinator.updateMany({ where: { userId: user.id }, data: { checkpointId } });
  if (updated.count === 0 && !user.isAdmin) return Response.json({ error: "No travel access" }, { status: 403 });
  return Response.json({ ok: true });
}
