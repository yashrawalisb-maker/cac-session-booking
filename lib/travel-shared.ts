// Client-safe Travel Log types + pure helpers (no Prisma import), shared by the API routes,
// the live dashboard, the scanner and the CSV export.

export const STAGES = ["BUS", "AIRPORT", "GATE"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = { BUS: "Bus", AIRPORT: "Airport", GATE: "Gate" };

export type TravelSlotDTO = {
  id: string;
  label: string;
  flightNo: string | null;
  departureAt: string | null;
};

export type TravelCheckpointDTO = { id: string; slotId: string; stage: Stage; label: string | null };

export type TravelStudentDTO = {
  id: string;
  name: string;
  pgpId: string;
  isbEmail: string;
  cohortSplit: string | null;
  slotId: string | null;
  busNumber: string | null;
};

export type TravelScanDTO = {
  id: string;
  userId: string;
  checkpointId: string;
  scannedById: string | null;
  scannedAt: string;
  method: "qr" | "manual";
  notes: string | null;
  /** true while the scan only exists in this phone's offline queue */
  pending?: boolean;
};

export type TravelSnapshot = {
  me: { userId: string; name: string; isAdmin: boolean; checkpointId: string | null };
  slots: TravelSlotDTO[];
  checkpoints: TravelCheckpointDTO[];
  students: TravelStudentDTO[];
  scanners: { id: string; name: string }[];
  scans: TravelScanDTO[];
};

export type StageMap = Partial<Record<Stage, TravelScanDTO>>;

export type SlotStats = {
  total: number;
  counts: Record<Stage, number>;
  /** Furthest stage with any check-ins (BUS if none yet) — what the tile tracks. */
  activeStage: Stage;
  done: number;
  pct: number;
};

export type Tone = "green" | "yellow" | "red";

/** >80% green, 50–80% amber, <50% red. */
export function toneFor(pct: number): Tone {
  if (pct > 80) return "green";
  if (pct >= 50) return "yellow";
  return "red";
}

export const TONE_CLASSES: Record<Tone, { bar: string; text: string; chip: string; ring: string }> = {
  green: { bar: "bg-success", text: "text-success", chip: "bg-success-bg text-success", ring: "ring-success/30" },
  yellow: { bar: "bg-warning", text: "text-warning", chip: "bg-warning-bg text-warning", ring: "ring-warning/30" },
  red: { bar: "bg-danger", text: "text-danger", chip: "bg-danger-bg text-danger", ring: "ring-danger/30" },
};

const TZ = "Asia/Kolkata";

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

export function fmtDeparture(iso: string | null | undefined) {
  if (!iso) return "Departure TBA";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** "2026-12-01 07:12:33" in IST — spreadsheet friendly. */
export function fmtStamp(iso: string | null | undefined) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/**
 * A student's stage counts as done if they were scanned at that stage at any checkpoint (e.g. a
 * wrong-flight override); a scan at their own flight's checkpoint wins over one elsewhere.
 */
export function buildStageIndex(
  scans: TravelScanDTO[],
  checkpointById: Map<string, TravelCheckpointDTO>,
  studentById: Map<string, TravelStudentDTO>,
): Map<string, StageMap> {
  const map = new Map<string, StageMap>();
  for (const scan of scans) {
    const cp = checkpointById.get(scan.checkpointId);
    if (!cp) continue;
    const entry = map.get(scan.userId) ?? {};
    const existing = entry[cp.stage];
    const ownSlot = studentById.get(scan.userId)?.slotId;
    const isOwn = (s: TravelScanDTO) => checkpointById.get(s.checkpointId)?.slotId === ownSlot;
    if (
      !existing ||
      (isOwn(scan) && !isOwn(existing)) ||
      (isOwn(scan) === isOwn(existing) && scan.scannedAt > existing.scannedAt)
    ) {
      entry[cp.stage] = scan;
    }
    map.set(scan.userId, entry);
  }
  return map;
}

export function statsFor(roster: TravelStudentDTO[], stageIndex: Map<string, StageMap>): SlotStats {
  const counts: Record<Stage, number> = { BUS: 0, AIRPORT: 0, GATE: 0 };
  for (const s of roster) {
    const st = stageIndex.get(s.id);
    if (st) for (const stage of STAGES) if (st[stage]) counts[stage]++;
  }
  const activeStage = [...STAGES].reverse().find((s) => counts[s] > 0) ?? "BUS";
  const done = counts[activeStage];
  return { total: roster.length, counts, activeStage, done, pct: roster.length ? (done / roster.length) * 100 : 0 };
}

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Manifest CSV: one row per student, check-in status/time/method/by/notes per stage. */
export function buildManifestCsv(snapshot: TravelSnapshot, stageIndex: Map<string, StageMap>, students: TravelStudentDTO[]) {
  const slotById = new Map(snapshot.slots.map((s) => [s.id, s]));
  const cpById = new Map(snapshot.checkpoints.map((c) => [c.id, c]));
  const scannerById = new Map(snapshot.scanners.map((m) => [m.id, m.name]));
  const header = [
    "Name",
    "PGP ID",
    "ISB Email",
    "Cohort Split",
    "Flight",
    "Flight No",
    "Bus",
    ...STAGES.flatMap((s) => [`${s} Status`, `${s} Time (IST)`, `${s} Method`, `${s} By`, `${s} Notes`]),
  ];
  const rows = students.map((st) => {
    const slot = st.slotId ? slotById.get(st.slotId) : undefined;
    const stages = stageIndex.get(st.id) ?? {};
    return [
      st.name,
      st.pgpId,
      st.isbEmail,
      st.cohortSplit,
      slot?.label ?? "Not assigned",
      slot?.flightNo,
      st.busNumber,
      ...STAGES.flatMap((stage) => {
        const scan = stages[stage];
        if (!scan) return ["Pending", "", "", "", ""];
        const scanSlotId = cpById.get(scan.checkpointId)?.slotId;
        const elsewhere = scanSlotId !== st.slotId;
        return [
          elsewhere ? `Checked in (${slotById.get(scanSlotId ?? "")?.label ?? "other flight"})` : "Checked in",
          fmtStamp(scan.scannedAt),
          scan.method === "manual" ? "Manual" : "QR",
          scan.scannedById ? (scannerById.get(scan.scannedById) ?? "") : "",
          scan.notes,
        ];
      }),
    ];
  });
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
}
