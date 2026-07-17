import { requireAdmin } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <AppShell
      variant="admin"
      userName={admin.name ?? admin.email ?? ""}
      userSubtitle="CAC Admin"
    >
      {children}
    </AppShell>
  );
}
