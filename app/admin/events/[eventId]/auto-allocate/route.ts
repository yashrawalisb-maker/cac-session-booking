import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { runAutoAllocation } from "@/lib/autoAllocate";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  await requireAdmin();
  const { eventId } = await ctx.params;

  const summary = await runAutoAllocation(prisma, eventId);

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");

  return NextResponse.json(summary);
}
