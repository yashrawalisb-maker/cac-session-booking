import { CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Downloads a .ics calendar invite for a booked session. Plain anchor (no client JS) — the
 * route sets Content-Disposition so the browser hands it to the OS calendar app.
 */
export function AddToCalendarLink({
  eventId,
  sessionId,
  className,
}: {
  eventId: string;
  sessionId: string;
  className?: string;
}) {
  return (
    <a
      href={`/events/${eventId}/sessions/${sessionId}/calendar`}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline",
        className
      )}
    >
      <CalendarPlus className="size-4" />
      Add to calendar
    </a>
  );
}
