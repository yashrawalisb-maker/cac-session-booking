# Setting up access & connections for a new contributor

This is the checklist for getting a second person (and their Claude Code / AI assistant) fully
working on this project — repo access, local dev environment, and the three external services
this app depends on: Supabase (database), Vercel (hosting), and Microsoft Entra ID / Azure AD
(sign-in). Read `docs/PROJECT_CONTEXT.md` first for *what* the project is; this is *how to get
set up to work on it*.

**Golden rule: no secret value belongs in this repo, in chat, or in any doc.** Every credential
below must be shared through the service's own invite mechanism or a secure channel (password
manager, Vercel's own env var UI, etc.) — never pasted into a file that gets committed.

---

## 1. GitHub — repo access (direct collaborator)

Repo: `https://github.com/yashrawalisb-maker/cac-session-booking`

- The repo owner adds the new contributor as a **direct collaborator with write access**
  (GitHub → repo → **Settings → Collaborators → Add people**, enter their GitHub username or
  email). They'll get an email/notification to accept the invite — needs a GitHub account first
  if they don't have one.
- Once accepted, clone:
  ```bash
  git clone https://github.com/yashrawalisb-maker/cac-session-booking.git
  ```
- **Git identity** (one-time, if this is a fresh machine/account):
  ```bash
  git config --global user.name "Their Name"
  git config --global user.email "their-email@example.com"
  ```
- **Authentication for pushing** — GitHub no longer accepts a plain password over HTTPS. Two
  options, pick one:
  - *HTTPS + Personal Access Token*: GitHub → profile → **Settings → Developer settings →
    Personal access tokens** → generate one with `repo` scope, use it as the password when Git
    prompts (or store it via `git credential-manager` / OS keychain so it's not re-typed).
  - *SSH*: generate a key (`ssh-keygen -t ed25519`), add the public key under GitHub → **Settings
    → SSH and GPG keys**, then clone/push with the `git@github.com:...` remote form instead of
    `https://`.
- Since they have direct write access (no fork/PR required), be deliberate about **pushing to
  `main`** — see the workflow note below.
- Established workflow: larger features go on a `feat/*` branch merged into `main`; small fixes
  have generally gone straight to `main`. **Vercel auto-deploys on every push to `main`** —
  nothing reaches production until that push happens, so treat a `main` push as a real deploy,
  not just a save point.

## 2. Local dev environment

```bash
npm install
npx prisma generate
```

Then create `.env` from `.env.example` (`.env` is gitignored) and fill in the real values —
see §3–4 below for where each one comes from. Once `.env` is populated:

```bash
npx prisma migrate deploy   # apply existing migrations (don't use `migrate dev` against shared data — see below)
npm run dev
```

The dev server config is already checked in at `.claude/launch.json` (`npm run dev` on port
3000) — Claude Code's built-in preview tooling can start it directly by name (`cac-dev`).

**Don't run `npx prisma migrate dev` against the shared Supabase database** — it can create
drift or reset behavior meant for a fresh local DB. If a schema change is needed, coordinate a
migration with the repo owner (or point `DATABASE_URL`/`DIRECT_URL` at a personal Supabase branch/
project for experimentation first).

**Windows/OneDrive note:** if this repo is cloned into a OneDrive-synced folder, stop the dev
server before running `npm run build` — both processes writing `.next` concurrently corrupts it.

## 3. Supabase (database)

- Project ref `apobiyuztyspavjzjagk`, region `ap-southeast-1` (Singapore), Postgres 17, free tier.
- Ask the repo owner to invite the new contributor to the Supabase project (Supabase dashboard →
  project → **Settings → Team**) so they can see the DB directly if needed (Table editor, logs).
- For `.env`, the repo owner shares two connection strings (via a secure channel, not chat/git):
  - `DATABASE_URL` — pooled/transaction pooler, **port 6543**, needs
    `?pgbouncer=true&sslmode=no-verify` (the `pg` adapter treats `sslmode=require` as
    verify-full, which fails against Supabase's pooler cert).
  - `DIRECT_URL` — session pooler, **port 5432**, needs `?sslmode=require` (Prisma's own engine,
    used only by the CLI for migrate/seed, reads this differently than the app's `pg` adapter).
  - The DB password contains an `@`, which must be percent-encoded as `%40` in the URL or it
    breaks (`@` is the userinfo/host separator) — if copying the password into a new string by
    hand, watch for this.

## 4. Vercel (hosting/deployment)

- Project: `cac-session-booking` (production URL `cac-session-booking.vercel.app`).
- Ask the repo owner to add the new contributor to the Vercel team/project (Vercel dashboard →
  project → **Settings → Members**) if they need deploy/env-var access there.
- Functions are pinned to region `sin1` (Singapore) via the committed `vercel.json` — this must
  stay matched to wherever the Supabase project lives; don't remove it.
- Environment variables in Vercel must mirror `.env` (see `.env.example` for the full list) —
  the repo owner manages these directly in the Vercel dashboard; local `.env` values are not
  synced automatically.

## 5. Microsoft Entra ID / Azure AD (sign-in)

- Multi-tenant app registration, issuer scoped to ISB's tenant
  `a4dae443-38ab-404a-b331-9d1d337fcf37`.
- The repo owner owns this app registration in the Azure Portal. If the new contributor needs to
  manage it directly (e.g. to rotate the secret or add a redirect URI), ask the repo owner to add
  them as an **Owner** or **Contributor** on the App Registration (Azure Portal → App
  registrations → the app → **Owners**).
- **The client secret expires** — this is a known recurring maintenance item, not a one-time
  setup step. When Microsoft sign-in suddenly breaks in production, check secret expiry first
  (Azure Portal → the app → **Certificates & secrets**), then rotate and update the value in both
  Vercel's env vars and local `.env`s.
- `.env` needs `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`,
  `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (see `.env.example` for the exact format) — the repo owner
  shares these via a secure channel.

## 6. Email (Resend) — currently unused, optional

`RESEND_API_KEY` / `RESEND_FROM_EMAIL` exist in `.env.example` but the app doesn't rely on them:
the ISB Microsoft tenant blocks SMTP and there's no owned domain to send transactional email
from, so booking acknowledgment is a downloadable `.ics` calendar invite instead (see
`docs/PROJECT_CONTEXT.md` §6). Leave these unset unless that changes.

## 7. `AUTH_SECRET`

Each environment (local, Vercel) needs its own `AUTH_SECRET` for signing session JWTs — generate
one locally with:

```bash
npx auth secret
```

This one doesn't need to be shared between contributors; each local `.env` can have its own.

## 8. Design references (if applicable)

The UI was built to match hand/Figma mockups ("One Club Conclave" branding, ISB navy/mint
palette, `public/campus.png` hero art). If there's a live Figma file the new contributor should
have access to for future design work, get the share link directly from the repo owner — none is
recorded here since it isn't tracked in the codebase.

## 9. What's *not* needed

This project has no other external service dependencies — no Notion, Slack, analytics, or
third-party MCP connectors are wired into the running app. If the new contributor's Claude Code
setup has other connectors available (Figma, Vercel's own MCP tool, etc.), those are convenience
integrations for *how* they work, not something this app requires to run.
