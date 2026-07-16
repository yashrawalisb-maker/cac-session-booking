import { requireAdmin } from "@/lib/authz";
import { SiteHeader } from "@/components/site-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader userName={admin.name ?? admin.email ?? ""} isAdmin={true} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
