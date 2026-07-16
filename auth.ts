import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordLoginAttempt } from "@/lib/rateLimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      id: "roster",
      name: "ISB Email + PGP ID",
      credentials: {
        isbEmail: { label: "ISB Email", type: "text" },
        pgpId: { label: "PGP ID", type: "text" },
      },
      async authorize(credentials) {
        const isbEmail = String(credentials?.isbEmail ?? "").trim();
        const pgpId = String(credentials?.pgpId ?? "").trim();
        if (!isbEmail || !pgpId) return null;

        // Return the same generic failure as a not-found match (never a distinct message) —
        // avoids revealing rate-limit state to a potential guesser.
        if (await isRateLimited(isbEmail)) return null;

        const user = await prisma.user.findFirst({
          where: {
            isbEmail: { equals: isbEmail, mode: "insensitive" },
            pgpId: { equals: pgpId, mode: "insensitive" },
          },
        });

        await recordLoginAttempt(isbEmail, !!user, user?.id);

        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.isbEmail,
          isAdmin: user.isAdmin,
        };
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "microsoft-entra-id") {
        const email = profile?.email ?? profile?.preferred_username ?? "";
        if (!email) return "/login?error=NoEmailFromMicrosoft";

        const roster = await prisma.user.findFirst({
          where: { isbEmail: { equals: String(email), mode: "insensitive" } },
        });

        if (!roster) return "/login?error=NotRegistered";

        user.id = roster.id;
        user.isAdmin = roster.isAdmin;
        user.name = roster.name;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
