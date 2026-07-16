import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/logout-action";

export function SiteHeader({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={isAdmin ? "/admin" : "/dashboard"}
          className="text-sm font-semibold tracking-tight text-foreground sm:text-base"
        >
          CAC Session Booking
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted-foreground sm:inline">{userName}</span>
          {isAdmin && (
            <Link href="/admin" className="text-primary hover:underline">
              Admin
            </Link>
          )}
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
