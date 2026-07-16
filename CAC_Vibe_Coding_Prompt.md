You are an expert full-stack engineer. Build a complete, working web application in one pass based on the exact specification below. Do not ask clarifying questions — where something is ambiguous, make the most sensible choice and note it in a short "Assumptions" section in your final summary. Prioritize a **working, end-to-end system** over polish.

Choose whatever modern, free-tier-friendly full-stack setup you're strongest at (e.g., a React/Next.js frontend with a Node/Express or Next.js API backend, and a relational database such as PostgreSQL or SQLite — use whatever your platform natively supports, such as Replit's built-in database). Keep the whole thing runnable with **zero paid services**: no paid auth provider, no paid email API tier, no paid hosting add-ons.

---

## 1. Product Summary

Build "CAC Session Booking" — a platform for the Career Advancement Council (CAC) at ISB. CAC runs multi-day **Events** (e.g., "OCC", a 2-day event). Each Event contains multiple **Sessions** (specific talks/slots, each with its own date, time, venue, speaker, and capacity). Every user is allotted a number of **tickets per Event** by an admin (e.g., 2 tickets for OCC), and can use those tickets to book that many distinct Sessions under that Event. There's an **Admin** side to manage everything, and a **User** side for the ~400 pre-loaded participants to log in and book.

---

## 2. Data Model

Implement these entities (adapt field names/types to your stack, but preserve all fields and relationships):

**User**
- id (PK)
- name
- isb_email (unique, string)
- pgp_id (unique, string)
- is_admin (boolean, default false)
- created_at

**Event**
- id (PK)
- name (string)
- description (text)
- start_date, end_date (date)
- booking_deadline (datetime)
- status (enum: draft, published, closed) — only `published` events are visible to non-admin users
- created_by (FK → User)
- created_at

**EventTicketAllotment**
- id (PK)
- event_id (FK → Event)
- user_id (FK → User)
- tickets_allotted (integer)
- unique constraint on (event_id, user_id)

**Session** (a bookable slot under an Event)
- id (PK)
- event_id (FK → Event)
- title (string)
- description (text)
- day_label (string, e.g. "Day 1")
- session_date (date)
- start_time, end_time (time)
- venue_name (string)
- venue_location (string)
- capacity (integer)
- speaker_profile_id (string)
- speaker_description (text)
- status (enum: open, closed, cancelled)
- created_at

**Booking**
- id (PK)
- user_id (FK → User)
- event_id (FK → Event)
- session_id (FK → Session)
- booking_type (enum: self_selected, auto_allotted)
- status (enum: confirmed, cancelled_by_admin)
- booked_at (datetime)
- unique constraint on (user_id, session_id) — a user can't book the same session twice

**AcknowledgmentLog**
- id (PK)
- booking_id (FK → Booking)
- channel (string, default "email")
- status (enum: sent, failed)
- sent_at (datetime)

Seed the database at startup with:
- 1–2 admin users (e.g., name "CAC Admin", email "cacadmin@isb.edu", pgp_id "ADMIN001", is_admin=true).
- A configurable seed script/CSV importer for the ~400 real users (name, isb_email, pgp_id) — for now, generate ~20 realistic dummy users (e.g., "PGP2027001" style IDs, name@isb.edu) so the app is demoable; make it trivial to swap in the real 400 later via a CSV upload or seed file.
- One sample Event ("OCC") spanning 2 days, in `published` status, with a booking deadline a few days in the future.
- 6–8 sample Sessions under OCC across Day 1 and Day 2, with varied capacities (some small, e.g. capacity 3, so you can demo a session filling up), varied venues, and dummy speaker info.
- Ticket allotments of 2 tickets per seeded user for the OCC event.

---

## 3. Authentication

No passwords, no OTP, no third-party auth provider (keep this zero-cost).

- **User login:** a simple form asking for **ISB Email** and **PGP ID**. On submit, look up a User row matching both fields exactly (case-insensitive on email). If found, create a session (cookie/JWT — whatever's simplest in your stack) and redirect to the user dashboard. If not found, show an inline error: "We couldn't find your details. Please check your ISB email and PGP ID, or contact CAC." Do not reveal which of the two fields was wrong.
- **Admin login:** a separate, simple admin login form using the same ISB Email + PGP ID mechanism, but only succeeds if `is_admin = true` on the matched user. Route admin pages behind this check; a non-admin must never be able to reach `/admin/*` routes even by direct URL.
- Sessions should be simple and stateless/lightweight (e.g., signed cookie), no need for refresh tokens or complex session management.

---

## 4. Admin Side — Pages & Features

### 4.1 Admin Dashboard (`/admin`)
- List of all Events with status, dates, and a quick fill-rate summary (e.g., "OCC — 42/60 tickets used").
- Button to create a new Event.

### 4.2 Event Management (`/admin/events/[id]`)
- Edit Event fields: name, description, start_date, end_date, booking_deadline, status (draft/published/closed).
- **Sessions list** for this event: table showing title, day, date/time, venue, capacity, current bookings ("48/70"), status. Buttons to add/edit/cancel a session.
- **Session create/edit form**: title, description, day_label, session_date, start_time, end_time, venue_name, venue_location, capacity, speaker_profile_id, speaker_description, status.
- **Ticket allotment panel**: set a default ticket count for all users on this event, with the ability to override individual users. Show a table of users with their current allotment and tickets-used count. Provide a simple CSV upload option (columns: pgp_id, tickets_allotted) as a stretch feature if time allows — otherwise a bulk "set default for all" input is sufficient for MVP.
- **Bookings panel**: table of all bookings for this event (user name, session, booking_type, booked_at), with export-to-CSV.
- **Auto-allocation control**: a button, "Run Auto-Allocation for Unused Tickets," visible once `booking_deadline` has passed. Clicking it:
  1. Finds every user with `tickets_allotted - tickets_used > 0` for this event.
  2. For each such user, randomly assigns sessions from those under this event that (a) are `status = open`, (b) still have available capacity, (c) the user hasn't already booked, until the user's remaining tickets are used or no eligible sessions remain.
  3. Creates each as a `Booking` with `booking_type = auto_allotted`, decrements available capacity, and triggers the acknowledgment email (see §6).
  4. Shows a summary after running: how many bookings were auto-created, and any users who couldn't be fully allotted (e.g., because everything eligible was full) — surface this clearly so the admin can follow up manually.
- **Manual override**: allow an admin to manually create a booking for a user (bypassing the normal ticket-remaining check only if explicitly confirmed) or cancel an existing booking (sets status to `cancelled_by_admin` and frees up the session's capacity again). Log a note/reason field for any manual override.

### 4.3 Users/Roster Page (`/admin/users`)
- Table of all users with name, email, pgp_id, is_admin flag.
- Simple way to add a user manually and (stretch) bulk-import via CSV (name, isb_email, pgp_id).

---

## 5. User Side — Pages & Features

### 5.1 Login (`/login`)
- Form: ISB Email, PGP ID → submit → validated against roster as described in §3.

### 5.2 My Events (`/dashboard`)
- After login, list every `published` Event for which this user has a ticket allotment (`EventTicketAllotment` row exists), showing: event name, dates, "X of Y tickets used."
- Click into an event to see its sessions.

### 5.3 Event Detail / Session Booking (`/events/[id]`)
- Header: event name, dates, booking deadline (with a countdown or clear "deadline passed" state), user's ticket summary ("You have 2 tickets — 1 used, 1 remaining").
- Sessions grouped by `day_label`, each shown as a card with: title, description, date + start–end time, venue name & location, speaker_profile_id + speaker_description, capacity and live "X seats remaining" (compute as `capacity - count(confirmed bookings)`).
- Each session card has a **Book** button whose state depends on:
  - Already booked by this user → show "Booked ✓" (disabled, no way to unbook).
  - Session full (remaining seats = 0) → show "Full" (disabled).
  - User has 0 tickets remaining for this event → show "No tickets remaining" (disabled).
  - Deadline has passed → show "Booking closed" (disabled) — except sessions already booked, which still show "Booked ✓".
  - Otherwise → active **Book** button.
- If auto-allocation already ran and gave this user a session, show it as "Booked ✓ (Auto-assigned)" so it's clearly distinguished from a self-selected pick.

### 5.4 Booking action (server-side logic — critical, must be race-condition safe)
On clicking Book, the server must, in a single atomic transaction:
1. Re-verify the user is authenticated and has a ticket allotment for this event.
2. Re-count confirmed bookings for the target session and confirm `count < capacity`. If not, reject with "This session just filled up — please choose another."
3. Re-count the user's confirmed bookings for this event and confirm `used < tickets_allotted`. If not, reject with "You have no tickets remaining for this event."
4. Confirm the user hasn't already booked this exact session.
5. If all checks pass, insert the `Booking` row (`booking_type = self_selected`, `status = confirmed`), then trigger the acknowledgment email (§6).
6. Return success and have the UI immediately reflect the new state (no page-breaking reload required, but a full refetch of the event's session list is fine).

Use a database transaction / row-level locking (or an equivalent atomic operation in your stack) around steps 2–5 so two simultaneous bookings can never both succeed on the last open seat.

---

## 6. Notifications (Acknowledgment Email)

- On every successful booking (self-selected or auto-allotted), send an email to the user's `isb_email` containing: event name, session title, day/date, start–end time, venue name & location, speaker_profile_id/description, and a line stating the booking is final and cannot be changed by the user.
- Use a free-tier transactional email service (e.g., Resend's free tier, or your platform's built-in email capability if available). If no email-sending capability is configured in this environment, implement the email-sending function behind a clean interface (e.g., `sendAcknowledgmentEmail(booking)`) so it can be wired up to a real provider later — and for now, log the "would-be" email content to the console/an admin-visible log table (`AcknowledgmentLog` with status) instead of failing the booking.
- A booking must still succeed even if the email fails to send — log the failure in `AcknowledgmentLog` with status "failed" rather than blocking the booking.

---

## 7. Business Rules Checklist (must all hold)

- [ ] Tickets are consumed per Event, not per Session — one ticket = one Session booking anywhere under that Event.
- [ ] A Session can never have more confirmed bookings than its `capacity` (enforced atomically, not just in the UI).
- [ ] A confirmed Booking can never be edited or cancelled by the user who made it — only an admin can cancel it.
- [ ] A user can never book the same Session twice.
- [ ] A user can never exceed their `tickets_allotted` for an Event.
- [ ] After `booking_deadline`, self-service booking is disabled for that event; only the admin's "Run Auto-Allocation" action can create further bookings for it.
- [ ] Auto-allocation only touches users with unused tickets, only picks sessions with remaining capacity, and never double-books a user into a session they already hold.
- [ ] A returning user always sees their true current state pulled fresh from the database — booked sessions, remaining tickets, and disabled states must be consistent no matter how many times they log in or reload.
- [ ] Admin routes are fully inaccessible to non-admin users, including via direct URL.
- [ ] Every booking is timestamped and shows whether it was self-selected or auto-allotted.

**Note on same-event time conflicts:** if two sessions under the same event overlap in date/time, by default prevent a user from booking both (since they can't physically attend both) — apply this check both in the manual booking flow (§5.4) and in the auto-allocation logic (§4.2). If you determine sessions in the seed data never overlap, implement the check anyway (it's cheap) so it's correct once real data with overlapping tracks is loaded.

---

## 8. Non-Functional Requirements

- Must run entirely on free-tier infrastructure — no paid database, auth, or email tier required to demo the full flow.
- Should comfortably handle ~400 users and a handful of events/sessions — no need for heavy scaling infrastructure.
- Responsive UI — must work well on mobile browsers (this is primarily accessed from phones).
- Clean, simple, professional UI — doesn't need heavy branding, but should look like a legitimate university platform, not a rough prototype. Use clear typography, a simple color scheme, and obvious button states (booked/full/disabled/active should be visually distinct at a glance).
- Show clear, friendly error/success messages for every user action (booking success, booking failure with reason, login failure).

---

## 9. Deliverable

Build the full application now: database schema/migrations, seed data, backend API/logic, and frontend pages for both Admin and User sides, wired together and runnable. At the end, provide:
1. A short summary of the tech stack you used and how to run it.
2. A short "Assumptions" section for anything you had to decide unilaterally.
3. Test login credentials (a sample admin and a sample regular user from the seed data) so the flow can be demoed immediately.
