import { prisma } from "./prisma";

const IST_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Sends the booking acknowledgment email. Must be called AFTER the booking transaction has
 * committed — never from inside it. A failed send must never fail the booking; log it instead.
 */
export async function sendAcknowledgmentEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, event: true, session: true },
  });
  if (!booking) return;

  const subject = `Booking confirmed: ${booking.session.title} — ${booking.event.name}`;
  const body = [
    `Hi ${booking.user.name},`,
    "",
    `Your booking is confirmed:`,
    `Event: ${booking.event.name}`,
    `Session: ${booking.session.title}`,
    `When: ${IST_FORMATTER.format(booking.session.startsAt)} – ${IST_FORMATTER.format(booking.session.endsAt)} IST`,
    `Venue: ${booking.session.venueName}${booking.session.venueLocation ? `, ${booking.session.venueLocation}` : ""}`,
    booking.session.speakerDescription ? `Speaker: ${booking.session.speakerDescription}` : undefined,
    "",
    "This booking is final and cannot be changed or cancelled by you. Contact CAC for any exceptions.",
  ]
    .filter(Boolean)
    .join("\n");

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[email:would-send] to=${booking.user.isbEmail} subject="${subject}"\n${body}`);
    await prisma.acknowledgmentLog.create({
      data: {
        bookingId: booking.id,
        channel: "email",
        status: "sent",
        detail: "RESEND_API_KEY not configured — logged instead of sent.",
      },
    });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "CAC Session Booking <onboarding@resend.dev>",
        to: booking.user.isbEmail,
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      await prisma.acknowledgmentLog.create({
        data: { bookingId: booking.id, channel: "email", status: "failed", detail: detail.slice(0, 500) },
      });
      return;
    }

    await prisma.acknowledgmentLog.create({
      data: { bookingId: booking.id, channel: "email", status: "sent" },
    });
  } catch (err) {
    await prisma.acknowledgmentLog.create({
      data: {
        bookingId: booking.id,
        channel: "email",
        status: "failed",
        detail: err instanceof Error ? err.message.slice(0, 500) : "Unknown error",
      },
    });
  }
}
