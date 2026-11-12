import { requireAdmin } from "@/lib/authz";
import { buildTravelSnapshot } from "@/lib/travel";
import { buildManifestCsv, buildStageIndex, fmtStamp } from "@/lib/travel-shared";

export const dynamic = "force-dynamic";

/** Manifest CSV for every student, or one flight with ?flight=<id> (?flight=unassigned too). */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  const flight = new URL(req.url).searchParams.get("flight");
  const snapshot = await buildTravelSnapshot({ id: admin.id!, name: admin.name ?? "", isAdmin: true });

  const cpById = new Map(snapshot.checkpoints.map((c) => [c.id, c]));
  const studentById = new Map(snapshot.students.map((s) => [s.id, s]));
  const stageIndex = buildStageIndex(snapshot.scans, cpById, studentById);
  const slotIds = new Set(snapshot.slots.map((s) => s.id));
  const students = snapshot.students
    .filter((s) => !flight || (flight === "unassigned" ? !s.slotId || !slotIds.has(s.slotId) : s.slotId === flight))
    .sort((a, b) => a.pgpId.localeCompare(b.pgpId));

  const label = flight ? (flight === "unassigned" ? "not-assigned" : (snapshot.slots.find((s) => s.id === flight)?.label ?? "flight")) : "all-flights";
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const stamp = fmtStamp(new Date().toISOString()).slice(0, 16).replace(/[: ]/g, "-");

  // BOM so Excel opens UTF-8 names correctly.
  return new Response("﻿" + buildManifestCsv(snapshot, stageIndex, students), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="travel-${slug}-${stamp}.csv"`,
    },
  });
}
