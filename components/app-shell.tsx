"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, Users, LogOut, Menu, X, Bell, Megaphone, ClipboardCheck } from "lucide-react";
import { IsbLogo } from "@/components/isb-logo";
import { logout } from "@/app/logout-action";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  isActive: (pathname: string) => boolean;
};

const STUDENT_NAV_BASE: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (p) => p === "/dashboard" || p.startsWith("/events"),
  },
  {
    label: "My Bookings",
    href: "/my-bookings",
    icon: Ticket,
    isActive: (p) => p.startsWith("/my-bookings"),
  },
  {
    label: "Updates",
    href: "/updates",
    icon: Megaphone,
    isActive: (p) => p.startsWith("/updates"),
  },
];

const ATTENDANCE_NAV_ITEM: NavItem = {
  label: "Attendance",
  href: "/attendance",
  icon: ClipboardCheck,
  isActive: (p) => p.startsWith("/attendance"),
};

const ADMIN_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    isActive: (p) => p === "/admin" || p.startsWith("/admin/events"),
  },
  {
    label: "Roster",
    href: "/admin/users",
    icon: Users,
    isActive: (p) => p.startsWith("/admin/users"),
  },
  {
    label: "Announcements",
    href: "/admin/announcements",
    icon: Megaphone,
    isActive: (p) => p.startsWith("/admin/announcements"),
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppShell({
  variant,
  userName,
  userSubtitle,
  unreadUpdates = false,
  showAttendanceTab = false,
  children,
}: {
  variant: "student" | "admin";
  userName: string;
  userSubtitle?: string;
  /** Shows a dot on the bell; student pages compute this via hasUnreadAnnouncements(). */
  unreadUpdates?: boolean;
  /** Shows the Attendance tab; student pages compute this via hasAttendanceAccess(). */
  showAttendanceTab?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav =
    variant === "admin"
      ? ADMIN_NAV
      : showAttendanceTab
        ? [...STUDENT_NAV_BASE, ATTENDANCE_NAV_ITEM]
        : STUDENT_NAV_BASE;

  const sidebar = (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-center justify-between px-2 pb-4 pt-1">
        <Link href={variant === "admin" ? "/admin" : "/dashboard"} className="flex items-center">
          <IsbLogo variant="navy" height={26} />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted md:hidden"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="mt-auto">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4.5 shrink-0" />
          Logout
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="md:hidden">
            <IsbLogo variant="navy" height={22} />
          </div>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <Link
              href={variant === "admin" ? "/admin/announcements" : "/updates"}
              className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={unreadUpdates ? "Updates (new announcements)" : "Updates"}
            >
              <Bell className="size-5" />
              {unreadUpdates && (
                <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-card bg-danger" />
              )}
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials(userName)}
              </span>
              <div className="hidden text-sm leading-tight sm:block">
                <div className="font-medium text-foreground">{userName}</div>
                {userSubtitle && (
                  <div className="text-xs text-muted-foreground">{userSubtitle}</div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
