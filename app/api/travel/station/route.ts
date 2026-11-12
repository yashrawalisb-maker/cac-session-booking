import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canUseTravelScanner } from "@/lib/travel";
import { STATION_REFRESH_MS, STATION_TOKEN_TTL_MS, makeStationToken } from "@/lib/travel-token";

export const dynamic = "force-dynamic";

/**
 * A fresh signed check-in token for the team member's station QR at one checkpoint.
 * The station page re-fetches this every STATION_REFRESH_MS.
 */
export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!(await canUseTravelScanner(user))) return Response.json({ error: "No travel access" }, { status: 403 });

  const checkpointId = new URL(req.url).searchParams.get("checkpointId");
  if (!checkpointId) return Response.json({ error: "checkpointId is required" }, { status: 400 });
  const checkpoint = await prisma.travelCheckpoint.findUnique({ where: { id: checkpointId }, select: { id: true } });
  if (!checkpoint) return Response.json({ error: "Unknown checkpoint" }, { status: 404 });

  const now = Date.now();
  return Response.json(
    {
      token: makeStationToken(checkpoint.id, user.id, now),
      expiresAt: new Date(now + STATION_TOKEN_TTL_MS).toISOString(),
      refreshMs: STATION_REFRESH_MS,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
