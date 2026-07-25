import { prisma } from "@/lib/prisma";

/** Whether this user has been granted attendance-marking access to at least one session — drives the sidebar tab. */
export async function hasAttendanceAccess(userId: string): Promise<boolean> {
  const count = await prisma.sessionAttendanceGrant.count({ where: { userId } });
  return count > 0;
}

/** Admins can mark attendance for any session; everyone else needs an explicit grant. */
export async function canMarkAttendance(userId: string, sessionId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const grant = await prisma.sessionAttendanceGrant.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  return !!grant;
}
