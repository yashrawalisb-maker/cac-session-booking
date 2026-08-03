import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, Users, ExternalLink, UserRound } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isPast } from "@/lib/time";
import { computeSessionStatus } from "@/lib/sessionStatus";
import { normalizeImageUrl } from "@/lib/imageUrl";
import { clubLabel } from "@/lib/clubs";
import { effectiveSpeakers } from "@/lib/speakers";
import { isWibClub, wibTrackLabel, wibTrackOrder } from "@/lib/wibTracks";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { hasAttendanceAccess } from "@/lib/attendance";
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

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tracks: true },
  });
  if (!session || session.eventId !== eventId) notFound();

  const allotment = await prisma.eventTicketAllotment.findUnique({
    where: { eventId_userId: { eventId, userId: user.id! } },
  });
  if (!allotment) notFound();

  const [myBooking, unreadUpdates, showAttendanceTab] = await Promise.all([
    prisma.booking.findUnique({
      where: { userId_sessionId: { userId: user.id!, sessionId } },
      select: { bookingType: true, status: true },
    }),
    hasUnreadAnnouncements(user.id!),
    hasAttendanceAccess(user.id!),
  ]);

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

  const speakers = effectiveSpeakers(session);
  const hasSpeaker = speakers.length > 0;

  // WIB sessions show table tracks (each its own capacity + speaker) instead of a flat speaker list.
  const sortedTracks = isWibClub(session.club)
    ? session.tracks.slice().sort((a, b) => wibTrackOrder(a.track) - wibTrackOrder(b.track))
    : [];
  const isWib = sortedTracks.length > 0;
  const bookableTracks = sortedTracks.map((t) => ({
    id: t.id,
    label: wibTrackLabel(t.track) ?? t.track,
    speakerName: t.speakerName,
    seatsRemaining: Math.max(t.capacity - t.bookedCount, 0),
  }));

  const keyTakeaways = session.keyTakeaways?.trim();
  const agenda = session.agenda?.trim();
  const whoShouldAttend = session.whoShouldAttend?.trim();

  return (
    <AppShell
      variant="student"
      userName={user.name ?? user.email ?? ""}
      userSubtitle={user.email ?? undefined}
      unreadUpdates={unreadUpdates}
      showAttendanceTab={showAttendanceTab}
    >
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
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="speaker">{isWib ? "Tracks" : "About speaker"}</TabsTrigger>
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
              </TabsContent>

              <TabsContent value="speaker" className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-3 text-base font-semibold">
                  {isWib ? "Table tracks" : `About the speaker${speakers.length > 1 ? "s" : ""}`}
                </h2>
                {isWib ? (
                  <div className="flex flex-col gap-5">
                    {sortedTracks.map((t) => {
                      const seats = Math.max(t.capacity - t.bookedCount, 0);
                      return (
                        <div
                          key={t.id}
                          className="flex flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0 sm:flex-row"
                        >
                          <SpeakerAvatar
                            name={t.speakerName ?? wibTrackLabel(t.track) ?? "Track"}
                            photoUrl={t.speakerPhotoUrl}
                            placeholder={!t.speakerName}
                            size={64}
                          />
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-foreground">{wibTrackLabel(t.track)}</p>
                              <span
                                className={`shrink-0 text-xs ${seats <= 0 ? "text-danger" : "text-muted-foreground"}`}
                              >
                                {seats <= 0 ? "Full" : `${seats} seat${seats === 1 ? "" : "s"} left`}
                              </span>
                            </div>
                            {t.speakerName && <p className="text-sm font-medium text-foreground">{t.speakerName}</p>}
                            {t.speakerRole && <p className="text-sm text-muted-foreground">{t.speakerRole}</p>}
                            {t.speakerBio && (
                              <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{t.speakerBio}</p>
                            )}
                            {t.speakerProfileUrl && (
                              <a
                                href={t.speakerProfileUrl}
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
                      );
                    })}
                  </div>
                ) : hasSpeaker ? (
                  <div className="flex flex-col gap-6">
                    {speakers.map((sp, i) => (
                      <div key={i} className="flex flex-col gap-4 sm:flex-row">
                        <SpeakerAvatar name={sp.name} photoUrl={sp.photoUrl} placeholder={false} size={64} />
                        <div className="flex flex-1 flex-col gap-1">
                          <p className="font-semibold text-foreground">{sp.name}</p>
                          {sp.role && <p className="text-sm text-muted-foreground">{sp.role}</p>}
                          {sp.bio && (
                            <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{sp.bio}</p>
                          )}
                          {sp.profileUrl && (
                            <a
                              href={sp.profileUrl}
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
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <SpeakerAvatar name="Speaker" photoUrl={null} placeholder size={64} />
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="font-semibold text-foreground">To be announced</p>
                      <p className="text-sm text-muted-foreground">
                        Speaker details will be shared here soon.
                      </p>
                    </div>
                  </div>
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
            {!isWib && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">
                {speakers.length > 1 ? "Speakers" : "Speaker profile"}
              </h3>
              {hasSpeaker ? (
                <div className="flex flex-col gap-4">
                  {speakers.map((sp, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <SpeakerAvatar name={sp.name} photoUrl={sp.photoUrl} placeholder={false} size={48} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{sp.name}</p>
                          {sp.role && <p className="text-xs text-muted-foreground">{sp.role}</p>}
                        </div>
                      </div>
                      {sp.profileUrl && (
                        <a
                          href={sp.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          View full profile
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <SpeakerAvatar name="Speaker" photoUrl={null} placeholder size={48} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">To be announced</p>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </div>
                </div>
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

            <SessionBookPanel
              eventId={eventId}
              sessionId={sessionId}
              sessionTitle={session.title}
              status={status}
              wibTracks={isWib ? bookableTracks : undefined}
            />
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
  placeholder = false,
}: {
  name: string;
  photoUrl: string | null;
  size: number;
  placeholder?: boolean;
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
      {placeholder ? <UserRound style={{ width: size * 0.5, height: size * 0.5 }} /> : initials(name)}
    </div>
  );
}
