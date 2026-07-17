import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IsbLogo } from "@/components/isb-logo";
import { logout } from "@/app/logout-action";

export function SiteHeader({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  return (
    <header className="border-b border-white/10 bg-brand-navy text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={isAdmin ? "/admin" : "/dashboard"}
          className="flex items-center gap-2.5"
        >
          <IsbLogo variant="white" height={22} />
          <span className="hidden text-sm font-medium text-white/70 sm:inline">
            CAC Session Booking
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-white/70 sm:inline">{userName}</span>
          {isAdmin && (
            <Link href="/admin" className="text-brand-mint hover:underline">
              Admin
            </Link>
          )}
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
