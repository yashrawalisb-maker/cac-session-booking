# Project context for contributors (and their Claude)

This file exists so a new person joining this project — and whatever Claude/AI assistant they
use — gets full context in one read, without re-deriving decisions that are already settled.
It's imported automatically into every Claude Code session opened in this repo (see
`CLAUDE.md` → `@docs/PROJECT_CONTEXT.md`).

**Read order for a new contributor:** this file first (current state + gotchas), then
`CAC_Session_Booking_PRD.md` and `CAC_Vibe_Coding_Prompt.md` (original spec + confirmed business
rules), then `README.md` (local setup). For getting actual access to GitHub/Vercel/Supabase/Azure,
see `docs/CONTRIBUTOR_SETUP.md`.

This doc is a snapshot, not a live feed — it will drift as the code moves on. If something here
contradicts the code, the code wins; update this file when that happens.

---

## 1. What this is

**CAC Session Booking** (branded "One Club Conclave 2026" / OCC) — a booking platform for the
Career Advancement Council at ISB. ~413 pre-registered PGP students log in and book Sessions
under multi-day Events within a per-Event ticket allotment set by admins. The real event runs
**Aug 8–9, 2026** (Sat–Sun). Deployed on Vercel at `cac-session-booking.vercel.app`, built solo
by Yash Rawal (repo owner) with Claude Code.

## 2. Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS + shadcn/ui (on **Base UI**, not Radix) ·
PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) hosted on **Supabase** · Auth.js v5 · deployed on
**Vercel**, functions pinned to region `sin1` (Singapore) via `vercel.json` to co-locate with the
Supabase DB in `ap-southeast-1` — cross-region (Vercel's US default) made every query ~200ms
slower and the app felt laggy.

## 3. Core data model (see `prisma/schema.prisma` for the source of truth)

`User` → `Event` → `Session` → `Booking`, plus:
- `EventTicketAllotment` — tickets per user per event (ticket scope is the *Event*, not the
  Session — a user with 2 tickets can book any 2 sessions under that event).
- `SessionTrack` — "table tracks" under a Women in Business (club `wib`) session; each track is
  a mini-session with its own capacity/speaker, and a student books exactly one track. Every
  non-WIB session has zero tracks and behaves exactly like a plain session.
- `SessionAttendanceGrant` — grants a **non-admin** user permission to mark attendance for one
  specific session (not admin rights — a narrow delegated capability).
- `Announcement` — admin-posted updates shown on the student "Updates" page with an unread bell.
- `Session.speakers` (JSON) — the multi-speaker source of truth: an array of
  `{name, role, photoUrl, bio, profileUrl}`. The older flat `speakerName`/`speakerRole`/etc.
  columns are kept mirrored to the *first* speaker for backward compatibility (see
  `lib/speakers.ts`). Always read speakers through `effectiveSpeakers()`, never the raw columns.
- `User.cohortSplit` vs `User.studyGroup` — **two different fields that look alike, don't confuse
  them.** `studyGroup` (e.g. "G12") is reference-only, unused in booking logic. `cohortSplit`
  (e.g. "G1"/"G2"… "L1"/"L2", ~35 students each) is a mandatory-attendance half-section split
  that drives the "whole group" mode of Manual Booking Override.

## 4. Confirmed business rules (don't re-decide these — see the PRD §10 for the full list)

- Tickets are per-Event; a session can never exceed its `capacity` (enforced atomically via
  conditional `updateMany`, not app-level checks — see `lib/booking.ts`).
- A confirmed booking is immutable by the user; only an admin can cancel/override one.
- A user can never double-book the same session (DB-level unique constraint as the backstop).
- Same-event time-overlapping sessions are blocked by default (`Event.overlapCheckEnabled`).
- Self-service booking closes at `Event.bookingDeadline`; **auto-allocation is explicitly exempt
  from the deadline check** (it *is* the post-deadline sweep — this was a real bug once, see
  gotcha list below).
- Auto-allocation only touches users with unused tickets, only picks sessions with remaining
  capacity, never double-books, and is idempotent/re-runnable.

## 5. Auth model

**Microsoft SSO is the only real login path.** The ISB email + PGP-ID roster form still exists in
code as a break-glass fallback (renders only if Microsoft SSO env vars are absent) but isn't
shown in normal operation. Azure AD app registration is multi-tenant, issuer scoped to ISB's
tenant `a4dae443-38ab-404a-b331-9d1d337fcf37`. The client secret **expires** — when Microsoft
login suddenly stops working, check that first.

`isAdmin` resolution is fragile — see gotcha #2 below before touching any auth callback.

## 6. Notifications: calendar invite, not email

The ISB Microsoft 365 tenant blocks SMTP tenant-wide, and there's no owned domain to send
transactional email from (Resend's free tier needs a DNS-verified domain). So booking
confirmation is a downloadable **`.ics` calendar invite** ("Add to calendar" — `lib/ics.ts` +
a gated route), not email. The `lib/email.ts` seam still exists, unused, in case a domain +
provider shows up later. Don't build a feature that assumes server-sent email will reach students.

## 7. Feature set (all shipped/deployed as of the latest commit)

- Atomic booking + auto-allocation (`lib/booking.ts`, `lib/autoAllocate.ts`)
- Admin: event/session CRUD (incl. delete-session and delete-event with type-to-confirm guards),
  roster CSV import (with `cohort_split` column support), ticket allotment (bulk, default +
  per-user override), bookings panel + CSV export, booking-reset controls (undo auto-allocation /
  reset all — recompute counters from the confirmed-booking source of truth)
- Manual Booking Override: single-user or **whole cohort-split group** mode (books every member
  of a G1/G2/…/L1/L2 split in one action; capacity is still a hard cap even in group mode)
- Club tagging (`lib/clubs.ts` — 10 clubs, plain string constants not an enum) + multi-select
  club filter on the student booking page
- Per-session attendance tracking with delegated access (`SessionAttendanceGrant`) — granted
  users get an "Attendance" tab scoped to just their session(s), Present/Absent toggles, CSV
  export per-session and per-event
- Announcements + student "Updates" page (unread bell, "happening today" IST schedule)
- Multi-speaker sessions (`lib/speakers.ts`) and WIB table-tracks (`lib/wibTracks.ts`,
  `components/wib-track-booking.tsx`) — a WIB session forces the student to pick one of several
  parallel table tracks before the booking is created
- Concurrency safety verified by `scripts/concurrency-test.ts`

## 8. Known gotchas — read before touching these areas

1. **Prisma interactive-transaction 5s timeout on bulk roster/booking operations.** Any admin
   action touching the full ~413-user roster or all of an event's bookings must use bulk
   `createMany`/`updateMany`, never a per-row loop inside one interactive transaction (this has
   broken twice: bulk ticket allotment, and booking-reset controls).

2. **`isAdmin` propagation through Auth.js is fragile — two distinct failure modes already hit:**
   - The `jwt`/`session` callbacks that set `isAdmin` must live in the shared, edge-safe
     `auth.config.ts` (used by `proxy.ts` middleware), not only in `auth.ts` — otherwise the edge
     middleware never sees `isAdmin` and admins loop `/admin` ⇄ `/login`.
   - For OAuth (Microsoft), don't trust a `signIn`-callback mutation of `user.isAdmin` to survive
     into the `jwt()` callback — it doesn't reliably. Any OAuth provider must re-resolve
     `id`/`isAdmin` from the roster by email **inside `jwt()`**, on every sign-in. (This bug once
     sent Microsoft-login admins, including the repo owner, to the student dashboard.)
   - After any auth-callback change: test **both** login paths and confirm an admin actually
     lands on `/admin`, not just that a student still works.

3. **Base UI's `Tabs` marks inactive panels with `inert`, not `hidden`.** Any new Base UI tabs
   component needs a `[&[inert]]:hidden` Tailwind rule or every panel renders stacked.

4. **Don't run `npm run build` while the dev server is live** (especially in this OneDrive-synced
   folder) — both write `.next` and corrupt it. Stop the dev server first; if you see a build/route
   -type error that makes no sense, try `rm -rf .next` before assuming it's a real bug.

5. **No server-sent email is possible for this tenant** — see §6 above. Don't reintroduce an
   email-dependent notification feature without checking this first.

6. **`datetime-local` inputs must go through `lib/time.ts` helpers, never raw `new Date()`.**
   The server's timezone (UTC on Vercel, IST on a local dev machine) silently shifts wall-clock
   times by up to 5.5 hours otherwise. Use `parseIstDateTime` to parse a submitted string and
   `toIstDateTimeLocal` to render a `defaultValue`. All event times are IST, no DST. (Plain
   `type="date"` fields — event start/end — are fine as-is: they're UTC-midnight end to end.)

7. **React 19 auto-resets a form after a server action completes**, which can revert a
   *displayed* value even when the DB save succeeded (hit once on the event Status dropdown).
   If a form field appears to "snap back" after Save but the data is actually correct in the DB,
   suspect this — the fix is controlled fields seeded from props + dispatching the action from
   `onSubmit` instead of the `action` prop.

## 9. Working conventions on this project

- **Discuss non-trivial features before building.** The repo owner expects a short design +
  trade-offs + a recommendation for anything beyond a small fix, then decides — don't jump
  straight to a large implementation on an ambiguous ask.
- **Feature branches merged to `main`** (e.g. `feat/wib-tracks`) is the established pattern for
  larger features; small fixes have generally gone straight to `main`.
- Vercel auto-deploys on push to `main` — nothing reaches production until someone actually
  pushes.
- Verify UI changes live in a browser before calling them done, not just via typecheck/tests.
