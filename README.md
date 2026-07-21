# CAC Session Booking

A self-serve session booking platform for the Career Advancement Council (CAC) at ISB.
Participants pick sessions under multi-day events (e.g. "OCC") within a per-event ticket
allotment; admins manage events, sessions, the roster, ticket allotments, and post-deadline
auto-allocation of unused tickets.

Full spec: [`CAC_Session_Booking_PRD.md`](./CAC_Session_Booking_PRD.md),
[`CAC_Vibe_Coding_Prompt.md`](./CAC_Vibe_Coding_Prompt.md).

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS + shadcn/ui
- PostgreSQL via Prisma 7 (driver adapter: `@prisma/adapter-pg`) — designed for Neon's free tier
- Auth.js v5 — ISB email + PGP ID roster lookup, plus Microsoft Entra ID sign-in
- Resend (free tier) for booking acknowledgment emails, with a console-log fallback

## Setup

1. Copy `.env.example` to `.env` and fill in the values (see comments in that file for what
   each one is and where to get it — Neon for Postgres, Azure AD app registration for
   Microsoft sign-in, Resend for email; all free tier).
2. Install dependencies and generate the Prisma client:
   ```bash
   npm install
   npx prisma generate
   ```
3. Apply the schema and seed demo data:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

Seed data creates an admin (`cacadmin@isb.edu` / `ADMIN001`), ~20 demo users
(`PGP2027001`–`PGP2027020`), and an "OCC" event with 8 sessions across 2 days.

## Microsoft (Entra ID) sign-in

The login page offers "Sign in with Microsoft" alongside the roster (email + PGP ID) form.
The button only renders when all three `AUTH_MICROSOFT_ENTRA_ID_*` vars are set
([`auth.ts`](./auth.ts)). Whichever email Microsoft returns must match a roster `isbEmail` in
our DB, or the sign-in is rejected with `?error=NotRegistered` — so the roster is the
authorization gate, not the tenant.

**App registration** (Azure Portal → App registrations, "ISB CAC platform"):

- **Client ID:** `5e6de170-230c-4dca-bd0e-8e6ba99319a6`
- **Account type (`signInAudience`):** `AzureADMultipleOrgs` (multi-tenant). Required because
  the app is registered in a personal directory but must accept users from ISB's *separate*
  tenant.
- **Issuer:** scoped to ISB's tenant so only ISB accounts can authenticate —
  `https://login.microsoftonline.com/a4dae443-38ab-404a-b331-9d1d337fcf37/v2.0`
- **Redirect URIs** (Authentication → Web — exact match, no trailing slash):
  - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (local dev)
  - `https://cac-session-booking.vercel.app/api/auth/callback/microsoft-entra-id` (production)

**Env vars** — set the three `AUTH_MICROSOFT_ENTRA_ID_*` locally in `.env` and in Vercel →
Project Settings → Environment Variables. The client secret is created under Azure →
Certificates & secrets (copy the **Value**, not the Secret ID).

**Gotchas:**

- **Secret expiry:** Azure client secrets expire (6/12/24 months). When the secret expires,
  Microsoft logins break until a new secret is generated and updated in both `.env` and Vercel.
- **Consent:** the first ISB user to sign in may hit a consent prompt; if ISB's tenant requires
  admin approval for third-party apps, an ISB IT admin must approve it once before anyone can
  log in.

## Verifying the booking concurrency guarantee

```bash
npx tsx scripts/concurrency-test.ts
```

Fires many simultaneous booking attempts at the seeded event's lowest-capacity session and
asserts exactly `capacity` succeed — proving the atomic conditional-update pattern in
[`lib/booking.ts`](./lib/booking.ts) holds under a race.

## Notes

- `RESEND_API_KEY` is optional locally — if unset, acknowledgment emails are logged to the
  console and recorded in `AcknowledgmentLog` instead of actually sending.
- Microsoft sign-in requires a real Azure AD redirect URI, so it can only be fully exercised
  against a fixed domain (production, or a pinned Vercel preview alias) — see `.env.example`.
