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
    where: { eventId },
    include: { user: true, session: true },
    orderBy: { bookedAt: "asc" },
  });

  const header = [
    "user_name",
    "isb_email",
    "pgp_id",
    "session_title",
    "day_label",
    "starts_at",
    "venue_name",
    "booking_type",
    "status",
    "booked_at",
  ];
  const rows = bookings.map((b) =>
    [
      b.user.name,
      b.user.isbEmail,
      b.user.pgpId,
      b.session.title,
      b.session.dayLabel,
      b.session.startsAt.toISOString(),
      b.session.venueName,
      b.bookingType,
      b.status,
      b.bookedAt.toISOString(),
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${eventId}.csv"`,
    },
  });
}
