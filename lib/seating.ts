import ExcelJS from "exceljs";

export type SeatingRow = { row: number; pgpId: string; seatNumber: string };
export type SeatingRowError = { row: number; error: string };

const PGID_HEADERS = ["pgid", "pgp_id", "pgp id"];
const SEAT_HEADERS = ["seat no.", "seat no", "seat number", "seat_number"];

/**
 * Parses a seating-chart workbook (e.g. "Assignment List" sheet: Fill #, Seat No., PGID, Name).
 * Scans every worksheet for a header row containing both a PGID-like and a Seat-No.-like column
 * — robust to the sheet being named/ordered differently across uploads — and reads data rows
 * from there. Sheets that don't match (e.g. a visual "Seating Chart" layout grid) are skipped.
 */
export async function parseSeatingWorkbook(
  buffer: ArrayBuffer
): Promise<{ rows: SeatingRow[]; errors: SeatingRowError[] } | { headerError: string }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  for (const sheet of workbook.worksheets) {
    const headerRow = sheet.getRow(1);
    const headerCells: { col: number; text: string }[] = [];
    headerRow.eachCell((cell, col) => {
      const text = String(cell.value ?? "").trim().toLowerCase();
      if (text) headerCells.push({ col, text });
    });

    const pgidCol = headerCells.find((c) => PGID_HEADERS.includes(c.text))?.col;
    const seatCol = headerCells.find((c) => SEAT_HEADERS.includes(c.text))?.col;
    if (!pgidCol || !seatCol) continue; // not the right sheet — e.g. the visual layout grid

    const rows: SeatingRow[] = [];
    const errors: SeatingRowError[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pgpId = String(row.getCell(pgidCol).value ?? "").trim();
      const seatNumber = String(row.getCell(seatCol).value ?? "").trim();
      if (!pgpId && !seatNumber) return; // blank row
      if (!pgpId) {
        errors.push({ row: rowNumber, error: "missing PGID" });
        return;
      }
      if (!seatNumber) {
        errors.push({ row: rowNumber, error: "missing seat number" });
        return;
      }
      rows.push({ row: rowNumber, pgpId, seatNumber });
    });

    return { rows, errors };
  }

  return { headerError: `No sheet found with both a PGID column (${PGID_HEADERS.join("/")}) and a Seat No. column (${SEAT_HEADERS.join("/")}).` };
}
