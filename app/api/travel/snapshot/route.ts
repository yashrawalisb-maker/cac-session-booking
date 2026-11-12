import { auth } from "@/auth";
import { buildTravelSnapshot, canUseTravelScanner } from "@/lib/travel";

export const dynamic = "force-dynamic";

/** Everything the dashboard/scanner needs in one request (≈400 students, ≤ ~1,250 scans). */
export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!(await canUseTravelScanner(user))) return Response.json({ error: "No travel access" }, { status: 403 });
  return Response.json(await buildTravelSnapshot({ id: user.id, name: user.name ?? "", isAdmin: !!user.isAdmin }));
}
