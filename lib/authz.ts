import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Signed-in user. CAC staff accounts (not students) only get the travel overview + check-in station,
 * so they're sent there from every other page unless the page opts in with `allowStaff`.
 */
export async function requireUser({ allowStaff = false }: { allowStaff?: boolean } = {}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.isStaff && !allowStaff) redirect("/travel/overview");
  return session.user;
}

/** Where a signed-in user lands. */
export function homePathFor(user: { isAdmin?: boolean; isStaff?: boolean }) {
  return user.isStaff ? "/travel/overview" : user.isAdmin ? "/admin" : "/dashboard";
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/dashboard");
  return session.user;
}
