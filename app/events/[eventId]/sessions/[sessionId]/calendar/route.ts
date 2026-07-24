import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildSessionIcs } from "@/lib/ics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; sessionId: string }> }
) {
  const { eventId, sessionId } = await params;
  const user = await requireUser();

  // Only issue an invite for a session this user has actually confirmed-booked.
  const booking = await prisma.booking.findUnique({
    where: { userId_sessionId: { userId: user.id!, sessionId } },
    include: { session: true, event: true },
  });
  if (!booking || booking.eventId !== eventId || booking.status !== "confirmed") {
    return new Response("Not found", { status: 404 });
  }

  const s = booking.session;
  const location = s.venueLocation ? `${s.venueName}, ${s.venueLocation}` : s.venueName;
  const ics = buildSessionIcs({
    uid: `${booking.id}@cac-session-booking`,
    title: `${s.title} — ${booking.event.name}`,
    description: s.description,
    location,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
  });

  const slug = s.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "").slice(0, 40) || "session";

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
