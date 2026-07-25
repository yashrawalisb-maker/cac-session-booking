import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  await requireAdmin();
  const { eventId } = await ctx.params;

  const bookings = await prisma.booking.findMany({
    where: { eventId, status: "confirmed" },
    include: { user: true, session: true },
    orderBy: [{ session: { startsAt: "asc" } }, { user: { name: "asc" } }],
  });

  const markerIds = [
    ...new Set(bookings.map((b) => b.attendanceMarkedBy).filter((id): id is string => !!id)),
  ];
  const markers = await prisma.user.findMany({
    where: { id: { in: markerIds } },
    select: { id: true, name: true },
  });
  const markerName = new Map(markers.map((m) => [m.id, m.name]));

  const header = [
    "session_title",
    "day_label",
    "user_name",
    "isb_email",
    "pgp_id",
    "attended",
    "marked_by",
    "marked_at",
  ];
  const rows = bookings.map((b) =>
    [
      b.session.title,
      b.session.dayLabel,
      b.user.name,
      b.user.isbEmail,
      b.user.pgpId,
      b.attended === null ? "" : b.attended ? "yes" : "no",
      b.attendanceMarkedBy ? (markerName.get(b.attendanceMarkedBy) ?? "") : "",
      b.attendanceMarkedAt ? b.attendanceMarkedAt.toISOString() : "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${eventId}.csv"`,
    },
  });
}
