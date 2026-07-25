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
  session: { strategy: "jwt" },
  callbacks: {
    // jwt/session live here (not just in auth.ts) so the edge middleware built from this config
    // also sees `isAdmin` on the session — otherwise the /admin gate below never passes for
    // admins and bounces them into a /admin ⇄ /login redirect loop.
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/admin")) {
        return isLoggedIn && !!auth?.user?.isAdmin;
      }
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/events") ||
        pathname.startsWith("/my-bookings") ||
        pathname.startsWith("/updates") ||
        pathname.startsWith("/attendance")
      ) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // populated in auth.ts
};
