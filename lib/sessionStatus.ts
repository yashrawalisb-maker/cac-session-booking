import type { SessionCardStatus } from "@/components/session-card";

/** Shared status-derivation logic — used by both the session list and the session detail page. */
export function computeSessionStatus(params: {
  bookingType: "self_selected" | "auto_allotted" | undefined;
  seatsRemaining: number;
  sessionStatus: string;
  ticketsRemaining: number;
  deadlinePassed: boolean;
}): SessionCardStatus {
  const { bookingType, seatsRemaining, sessionStatus, ticketsRemaining, deadlinePassed } = params;
  if (bookingType === "auto_allotted") return "booked_auto";
  if (bookingType) return "booked";
  if (seatsRemaining <= 0 || sessionStatus !== "open") return "full";
  if (ticketsRemaining <= 0) return "no_tickets";
  if (deadlinePassed) return "deadline_passed";
  return "bookable";
}
