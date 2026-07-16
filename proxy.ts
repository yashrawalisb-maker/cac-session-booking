import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 renamed `middleware.ts`/`export function middleware` to `proxy.ts`/`export function proxy`.
// Built from the edge-safe authConfig only (no Prisma import) so it can decode the JWT cheaply
// without a DB round-trip.
const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/events/:path*"],
};
