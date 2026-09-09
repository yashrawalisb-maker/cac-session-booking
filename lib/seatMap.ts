/**
 * Reconstructs a tappable seat-map layout purely from each booking's seat number (e.g. "C1",
 * "F16") — no dependency on the visual "Seating Chart" grid sheet (which the xlsx parser
 * deliberately skips, see lib/seating.ts). A seat number's leading letters are its row, its
 * trailing digits are its column; within a row, seats are ordered by column and a gap is
 * inserted wherever the column numbers aren't consecutive, which reconstructs real aisles since
 * each physical block uses consecutive numbering.
 */

const SEAT_LABEL = /^([A-Za-z]+)(\d+)$/;

export function parseSeatLabel(seatNumber: string): { row: string; col: number } | null {
  const match = SEAT_LABEL.exec(seatNumber.trim());
  if (!match) return null;
  return { row: match[1].toUpperCase(), col: Number(match[2]) };
}

export type SeatCell =
  | { type: "seat"; bookingId: string; seatNumber: string; col: number }
  | { type: "gap" };

export type SeatMapRow = { label: string; cells: SeatCell[] };

export function buildSeatMap(
  rows: { bookingId: string; seatNumber: string | null }[]
): SeatMapRow[] {
  const byRow = new Map<string, { col: number; bookingId: string; seatNumber: string }[]>();
  for (const r of rows) {
    if (!r.seatNumber) continue;
    const parsed = parseSeatLabel(r.seatNumber);
    if (!parsed) continue;
    const arr = byRow.get(parsed.row) ?? [];
    arr.push({ col: parsed.col, bookingId: r.bookingId, seatNumber: r.seatNumber });
    byRow.set(parsed.row, arr);
  }

  // Row A nearest the stage, so rows read top-to-bottom as the furthest-from-stage letter first.
  const rowLabels = Array.from(byRow.keys()).sort().reverse();

  return rowLabels.map((label) => {
    const seats = byRow.get(label)!.sort((a, b) => a.col - b.col);
    const cells: SeatCell[] = [];
    let prevCol: number | null = null;
    for (const s of seats) {
      if (prevCol !== null && s.col - prevCol > 1) {
        cells.push({ type: "gap" });
      }
      cells.push({ type: "seat", bookingId: s.bookingId, seatNumber: s.seatNumber, col: s.col });
      prevCol = s.col;
    }
    return { label, cells };
  });
}
