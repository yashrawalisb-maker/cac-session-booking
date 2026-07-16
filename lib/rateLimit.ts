import { prisma } from "./prisma";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 8;

/** Simple DB-backed login rate limit: guards the no-password roster lookup against guessing. */
export async function isRateLimited(identifier: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.loginAttempt.count({
    where: { identifier: identifier.toLowerCase(), createdAt: { gte: since }, success: false },
  });
  return count >= MAX_ATTEMPTS;
}

export async function recordLoginAttempt(identifier: string, success: boolean, userId?: string) {
  await prisma.loginAttempt.create({
    data: { identifier: identifier.toLowerCase(), success, userId },
  });
}
