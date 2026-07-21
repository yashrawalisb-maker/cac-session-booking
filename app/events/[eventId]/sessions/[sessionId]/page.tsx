import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, Users, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isPast } from "@/lib/time";
import { computeSessionStatus } from "@/lib/sessionStatus";
import { normalizeImageUrl } from "@/lib/imageUrl";
import { clubLabel } from "@/lib/clubs";
import { AppShell } from "@/components/app-shell";
import { SessionBookPanel } from "@/components/session-book-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
});

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Bullets({ text }: { text: string }) {
  const items = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-navy-tint text-[10px] font-bold text-primary">
            ✓
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; sessionId: string }>;
}) {
  const { eventId, sessionId } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "published") notFound();

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.eventId !== eventId) notFound();

  const allotment = await prisma.eventTicketAllotment.findUnique({
    where: { eventId_userId: { eventId, userId: user.id! } },
  });
  if (!allotment) notFound();

  const myBooking = await prisma.booking.findUnique({
    where: { userId_sessionId: { userId: user.id!, sessionId } },
    select: { bookingType: true, status: true },
  });

  const deadlinePassed = isPast(event.bookingDeadline);
  const ticketsRemaining = allotment.ticketsAllotted - allotment.ticketsUsed;
  const seatsRemaining = Math.max(session.capacity - session.bookedCount, 0);
  const status = computeSessionStatus({
    bookingType: myBooking?.status === "confirmed" ? myBooking.bookingType : undefined,
    seatsRemaining,
    sessionStatus: session.status,
    ticketsRemaining,
    deadlinePassed,
  });

  const speakerName = session.speakerName ?? session.speakerDescription ?? null;
  const speakerRole = session.speakerRole;
  const speakerBio = session.speakerBio ?? session.speakerDescription;
  const hasSpeaker = !!(speakerName || speakerBio);

  const keyTakeaways = session.keyTakeaways?.trim();
  const agenda = session.agenda?.trim();
  const whoShouldAttend = session.whoShouldAttend?.trim();

  return (
    <AppShell variant="student" userName={user.name ?? user.email ?? ""} userSubtitle={user.email ?? undefined}>
      <div className="flex flex-col gap-6">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to all events
        </Link>

        {/* Hero */}
        <div
          className="relative overflow-hidden rounded-xl text-white"
          style={{ background: "linear-gradient(160deg, var(--brand-navy) 0%, var(--brand-navy-deep) 100%)" }}
        >
          <div className="relative z-10 flex flex-col gap-3 px-6 py-8 sm:px-8">
            <span className="inline-flex w-fit items-center rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold">
              {session.dayLabel.toUpperCase()}
            </span>
            <h1 className="max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">
              {session.title}
            </h1>
            <div className="mt-2 flex flex-col gap-2 text-sm text-white/85 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              <span className="flex items-center gap-2">
                <CalendarClock className="size-4" />
                {DATE_FORMATTER.format(session.startsAt)}, {TIME_FORMATTER.format(session.startsAt)} –{" "}
                {TIME_FORMATTER.format(session.endsAt)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4" />
                {session.venueName}
                {session.venueLocation ? `, ${session.venueLocation}` : ""}
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4" />
                {seatsRemaining} of {session.capacity} seats remaining
              </span>
            </div>
          </div>
          <Image
            src="/campus.png"
            alt=""
            width={655}
            height={323}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full select-none object-cover object-bottom opacity-90 sm:h-32"
          />
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="speaker">About speaker</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="attend">Who should attend</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex flex-col gap-6">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-2 text-base font-semibold">About the event</h2>
                  {session.description ? (
                    <p className="mb-4 text-sm whitespace-pre-line text-muted-foreground">
                      {session.description}
                    </p>
                  ) : (
                    <p className="mb-4 text-sm text-muted-foreground">No description added yet.</p>
                  )}
                  {keyTakeaways && (
                    <>
                      <h3 className="mb-2 text-sm font-semibold">Key takeaways</h3>
                      <Bullets text={keyTakeaways} />
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-3 text-base font-semibold">About the venue</h2>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {session.venuePhotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URL, arbitrary domain
                      <img
                        src={normalizeImageUrl(session.venuePhotoUrl)}
                        alt={session.venueName}
                        className="h-40 w-full rounded-lg object-cover sm:w-56"
                      />
                    )}
                    <div className="flex flex-1 flex-col gap-1.5">
                      <p className="font-medium text-foreground">
                        {session.venueName}
                        {session.venueLocation ? `, ${session.venueLocation}` : ""}
                      </p>
                      {session.campus && <p className="text-sm text-muted-foreground">{session.campus}</p>}
                      {session.venueDescription && (
                        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                          {session.venueDescription}
                        </p>
                      )}
                      {session.venueMapUrl && (
                        <a
                          href={session.venueMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <MapPin className="size-4" />
                          View on map
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="speaker" className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-3 text-base font-semibold">About the speaker</h2>
                {hasSpeaker ? (
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <SpeakerAvatar name={speakerName ?? "Speaker"} photoUrl={session.speakerPhotoUrl} size={64} />
                    <div className="flex flex-1 flex-col gap-1">
                      {speakerName && <p className="font-semibold text-foreground">{speakerName}</p>}
                      {speakerRole && <p className="text-sm text-muted-foreground">{speakerRole}</p>}
                      {speakerBio && (
                        <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{speakerBio}</p>
                      )}
                      {session.speakerProfileUrl && (
                        <a
                          href={session.speakerProfileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          View full profile
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No speaker details added yet.</p>
                )}
              </TabsContent>

              <TabsContent value="agenda" className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-3 text-base font-semibold">Agenda</h2>
                {agenda ? (
                  <p className="text-sm whitespace-pre-line text-foreground">{agenda}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No agenda has been added yet.</p>
                )}
              </TabsContent>

              <TabsContent value="attend" className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-3 text-base font-semibold">Who should attend</h2>
                {whoShouldAttend ? (
                  <p className="text-sm whitespace-pre-line text-foreground">{whoShouldAttend}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No guidance has been added yet.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {hasSpeaker && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Speaker profile</h3>
                <div className="flex items-center gap-3">
                  <SpeakerAvatar name={speakerName ?? "Speaker"} photoUrl={session.speakerPhotoUrl} size={48} />
                  <div>
                    {speakerName && <p className="text-sm font-semibold text-foreground">{speakerName}</p>}
                    {speakerRole && <p className="text-xs text-muted-foreground">{speakerRole}</p>}
                  </div>
                </div>
                {session.speakerProfileUrl && (
                  <a
                    href={session.speakerProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    View full profile
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold">Event details</h3>
              <div className="divide-y divide-border">
                <DetailRow
                  label="Date & time"
                  value={`${DATE_FORMATTER.format(session.startsAt)}, ${TIME_FORMATTER.format(session.startsAt)} – ${TIME_FORMATTER.format(session.endsAt)}`}
                />
                <DetailRow
                  label="Venue"
                  value={session.venueLocation ? `${session.venueName}, ${session.venueLocation}` : session.venueName}
                />
                <DetailRow label="Campus" value={session.campus} />
                <DetailRow label="Event type" value={session.eventType} />
                <DetailRow label="Club" value={clubLabel(session.club)} />
                <DetailRow
                  label="Seats"
                  value={<span className="text-success">{seatsRemaining} of {session.capacity} remaining</span>}
                />
              </div>
            </div>

            <SessionBookPanel eventId={eventId} sessionId={sessionId} status={status} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SpeakerAvatar({
  name,
  photoUrl,
  size,
}: {
  name: string;
  photoUrl: string | null;
  size: number;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URL, arbitrary domain
      <img
        src={normalizeImageUrl(photoUrl)}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-navy-tint text-sm font-semibold text-primary"
    >
      {initials(name)}
    </div>
  );
}
