import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homePathFor } from "@/lib/authz";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  redirect(homePathFor(session.user));
}
