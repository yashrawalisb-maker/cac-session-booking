import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { wibTrackLabel } from "@/lib/wibTracks";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function slugify(title: string) {
  return title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "").slice(0, 40) || "session";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string; sessionId: string }> }
) {
  await requireAdmin();
  const { eventId, sessionId } = await ctx.params;

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.eventId !== eventId) notFound();

  const bookings = await prisma.booking.findMany({
    where: { sessionId, status: "confirmed" },
    include: { user: true, sessionTrack: true },
    orderBy: { user: { name: "asc" } },
  });

  const header = ["name", "pgp_id", "table_track", "attendance"];
  const rows = bookings.map((b) =>
    [
      b.user.name,
      b.user.pgpId,
      b.sessionTrack ? wibTrackLabel(b.sessionTrack.track) ?? "" : "",
      b.attended === null ? "" : b.attended ? "present" : "absent",
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${slugify(session.title)}.csv"`,
    },
  });
}
