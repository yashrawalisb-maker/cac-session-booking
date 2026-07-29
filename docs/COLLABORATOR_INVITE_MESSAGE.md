Hey — bringing you on to help build out **CAC Session Booking** (the "One Club Conclave 2026"
booking platform for ISB's Career Advancement Council). Quick rundown to get you moving:

**What it is:** ~413 pre-registered PGP students log in via Microsoft SSO and book Sessions
under multi-day Events (the real event is Aug 8–9, 2026) within a per-event ticket limit. There's
a full admin side for managing events/sessions/roster/tickets, plus auto-allocation, attendance
tracking, and a few event-specific features (multi-speaker sessions, WIB table-tracks, cohort
group booking).

**Start here — two docs in the repo, read in this order:**
1. [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) — what's built, the data model, confirmed
   business rules, and a list of gotchas already hit and fixed (read this before touching auth,
   bulk roster ops, or datetime handling — it'll save you from re-discovering bugs we already
   fixed once). This one also auto-loads into Claude Code's context, so if you're using Claude
   Code to work on this, it'll already know all of this the moment you open the repo.
2. [`docs/CONTRIBUTOR_SETUP.md`](docs/CONTRIBUTOR_SETUP.md) — how to get access to everything:
   GitHub, local dev environment, Supabase (DB), Vercel (hosting), Microsoft Entra ID (sign-in).

**Access you'll get from me directly (not over chat — through each service's own invite):**
- GitHub: direct collaborator (write) access on the repo — you'll get a GitHub invite email.
- Supabase: project team invite, if you need direct DB access.
- Vercel: project member invite, if you need to see deploys/env vars directly.
- Azure AD (Microsoft sign-in): I'll add you as Owner/Contributor on the app registration if you
  need to manage it; otherwise I'll just share the three auth env vars with you securely.

**A few things worth knowing up front:**
- You'll have direct push access to `main` — no fork/PR requirement — but pushing to `main`
  triggers an **immediate production deploy** on Vercel, so treat it accordingly. Larger features
  go on a `feat/*` branch first.
- For anything beyond a small fix, let's talk through the approach before building — happy to do
  that async or on a call.
- The original spec is `CAC_Session_Booking_PRD.md` and `CAC_Vibe_Coding_Prompt.md` at the repo
  root, if you want the full original requirements.

Ping me once you've got repo access and I'll get you the `.env` values and the rest of the
service invites.
