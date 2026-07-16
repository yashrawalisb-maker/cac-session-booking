/** Minimal RFC4180-ish CSV parser — sufficient for simple roster/allotment files (no embedded newlines in fields). */
export function parseCsv(text: string): string[][] {
  return text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCsvLine(line));
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

export type CsvRowResult<T> = { row: number; data?: T; error?: string };

/** Parses a CSV with a header row, mapping each data row via `mapper`; collects per-row errors. */
export function parseCsvWithHeader<T>(
  text: string,
  requiredHeaders: string[],
  mapper: (record: Record<string, string>, rowIndex: number) => T
): { results: CsvRowResult<T>[]; headerError?: string } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { results: [], headerError: "CSV is empty." };

  const header = rows[0].map((h) => h.trim());
  const missing = requiredHeaders.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return { results: [], headerError: `Missing required column(s): ${missing.join(", ")}` };
  }

  const results: CsvRowResult<T>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const record: Record<string, string> = {};
    header.forEach((h, idx) => {
      record[h] = rows[i][idx] ?? "";
    });
    try {
      const data = mapper(record, i + 1);
      results.push({ row: i + 1, data });
    } catch (e) {
      results.push({ row: i + 1, error: e instanceof Error ? e.message : "Invalid row" });
    }
  }
  return { results };
}
