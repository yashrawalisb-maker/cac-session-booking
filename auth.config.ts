import type { NextAuthConfig } from "next-auth";

/**
 * Edge/proxy-safe config only: no providers, no Prisma import. Used by proxy.ts to decode the
 * already-issued JWT and gate routes without a DB round-trip. The full provider config (which
 * needs Prisma) lives in auth.ts and must never be imported here.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/admin")) {
        return isLoggedIn && !!auth?.user?.isAdmin;
      }
      if (pathname.startsWith("/dashboard") || pathname.startsWith("/events")) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // populated in auth.ts
};
