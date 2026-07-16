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
