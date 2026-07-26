import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordLoginAttempt } from "@/lib/rateLimit";

// Only wire up Microsoft sign-in once its app registration is actually configured — NextAuth
// validates every configured provider eagerly, so an empty/partial config here would break
// the roster login too, not just the Microsoft path.
export const microsoftSignInEnabled = Boolean(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
);

const providers: Provider[] = [
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
];

if (microsoftSignInEnabled) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers,
  callbacks: {
    // session/authorized are inherited from authConfig (shared with the edge middleware).
    // signIn and the enriching jwt need Prisma, so they live here in the Node-runtime config.
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
    // Overrides the edge passthrough jwt (auth.config.ts) in the Node runtime. On sign-in we
    // resolve id/isAdmin straight from the roster by email — reliable for BOTH providers. The
    // Microsoft provider's `user` has no isAdmin, and mutating it in signIn doesn't dependably
    // reach this callback, so we never trust that; we look it up. The result is baked into the
    // JWT cookie at sign-in, which the edge middleware then reads via the shared session callback.
    async jwt({ token, user, profile }) {
      if (user) {
        const email =
          (user.email as string | undefined) ??
          (profile?.email as string | undefined) ??
          (profile?.preferred_username as string | undefined);

        const roster = email
          ? await prisma.user.findFirst({
              where: { isbEmail: { equals: String(email), mode: "insensitive" } },
              select: { id: true, isAdmin: true },
            })
          : null;

        token.userId = roster?.id ?? (user.id as string | undefined);
        token.isAdmin = roster?.isAdmin ?? Boolean((user as { isAdmin?: boolean }).isAdmin);
      }
      return token;
    },
  },
});
