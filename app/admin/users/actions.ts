"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { parseCsvWithHeader } from "@/lib/csv";
import { isCohortSplitValue } from "@/lib/cohortSplits";

export type ActionState = { error?: string; success?: boolean; message?: string } | undefined;

export async function createUser(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const isbEmail = String(formData.get("isbEmail") ?? "").trim();
  const pgpId = String(formData.get("pgpId") ?? "").trim();
  const isAdmin = formData.get("isAdmin") === "on";

  if (!name || !isbEmail || !pgpId) {
    return { error: "Name, ISB email, and PGP ID are required." };
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { isbEmail: { equals: isbEmail, mode: "insensitive" } },
        { pgpId: { equals: pgpId, mode: "insensitive" } },
      ],
    },
  });
  if (existing) return { error: "A user with this ISB email or PGP ID already exists." };

  await prisma.user.create({ data: { name, isbEmail, pgpId, isAdmin } });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function importUsersCsv(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a CSV file." };
  const text = await file.text();

  const { results, headerError } = parseCsvWithHeader(
    text,
    ["name", "isb_email", "pgp_id"],
    (record, row) => {
      const name = record.name?.trim();
      const isbEmail = record.isb_email?.trim();
      const pgpId = record.pgp_id?.trim();
      const section = record.section?.trim() || undefined;
      const studyGroup = record.study_group?.trim() || undefined;
      const cohortSplitRaw = record.cohort_split?.trim();
      const cohortSplit = cohortSplitRaw || undefined;
      if (!name) throw new Error(`Row ${row}: missing name`);
      if (!isbEmail) throw new Error(`Row ${row}: missing isb_email`);
      if (!pgpId) throw new Error(`Row ${row}: missing pgp_id`);
      if (cohortSplit && !isCohortSplitValue(cohortSplit)) {
        throw new Error(`Row ${row}: invalid cohort_split "${cohortSplit}" (expected e.g. G1, G2)`);
      }
      return { name, isbEmail, pgpId, section, studyGroup, cohortSplit };
    }
  );
  if (headerError) return { error: headerError };

  const errors = results.filter((r) => r.error).map((r) => r.error!);
  const valid = results.filter(
    (
      r
    ): r is {
      row: number;
      data: {
        name: string;
        isbEmail: string;
        pgpId: string;
        section: string | undefined;
        studyGroup: string | undefined;
        cohortSplit: string | undefined;
      };
    } => !!r.data
  );

  // Catch in-file duplicates before hitting the DB.
  const seenEmails = new Map<string, number>();
  const seenPgpIds = new Map<string, number>();
  const deduped: typeof valid = [];
  for (const v of valid) {
    const emailKey = v.data.isbEmail.toLowerCase();
    const pgpKey = v.data.pgpId.toLowerCase();
    if (seenEmails.has(emailKey)) {
      errors.push(`Row ${v.row}: duplicate isb_email also seen on row ${seenEmails.get(emailKey)}`);
      continue;
    }
    if (seenPgpIds.has(pgpKey)) {
      errors.push(`Row ${v.row}: duplicate pgp_id also seen on row ${seenPgpIds.get(pgpKey)}`);
      continue;
    }
    seenEmails.set(emailKey, v.row);
    seenPgpIds.set(pgpKey, v.row);
    deduped.push(v);
  }

  const existingUsers = await prisma.user.findMany({
    select: { isbEmail: true, pgpId: true },
  });
  const existingEmails = new Set(existingUsers.map((u) => u.isbEmail.toLowerCase()));
  const existingPgpIds = new Set(existingUsers.map((u) => u.pgpId.toLowerCase()));

  let created = 0;
  for (const v of deduped) {
    if (existingEmails.has(v.data.isbEmail.toLowerCase())) {
      errors.push(`Row ${v.row}: isb_email ${v.data.isbEmail} already exists`);
      continue;
    }
    if (existingPgpIds.has(v.data.pgpId.toLowerCase())) {
      errors.push(`Row ${v.row}: pgp_id ${v.data.pgpId} already exists`);
      continue;
    }
    await prisma.user.create({
      data: {
        name: v.data.name,
        isbEmail: v.data.isbEmail,
        pgpId: v.data.pgpId,
        section: v.data.section,
        studyGroup: v.data.studyGroup,
        cohortSplit: v.data.cohortSplit,
      },
    });
    existingEmails.add(v.data.isbEmail.toLowerCase());
    existingPgpIds.add(v.data.pgpId.toLowerCase());
    created++;
  }

  revalidatePath("/admin/users");
  if (errors.length > 0) {
    return { error: `Created ${created} user(s). Errors:\n${errors.join("\n")}` };
  }
  return { success: true, message: `Created ${created} user(s).` };
}
