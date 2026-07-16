# Product Requirements Document (PRD)
## CAC Session Booking Platform — Career Advancement Council, ISB

**Version:** 1.0
**Date:** July 15, 2026
**Status:** Draft for build (MVP)

---

## 1. Background & Problem Statement

The Career Advancement Council (CAC) at ISB runs multi-day events (e.g., **OCC**) made up of several parallel/sequential sessions. Each participant is allotted a limited number of tickets for the event and must choose which specific sessions to attend. Today this selection process has no dedicated system — there's no way to control per-session capacity, prevent double-booking, or guarantee every seat is filled by the deadline.

This platform gives CAC a simple, self-serve way to:
- Let ~400 pre-registered ISB participants pick their sessions within their ticket limit.
- Give CAC admins full control over event/session creation, capacity, and ticket allotment.
- Automatically fill unclaimed tickets once the booking deadline passes.

---

## 2. Goals

1. Allow admins to create **Events** (e.g., "OCC") and, under each, multiple **Sessions** (defined by day/date/time, venue, speaker, capacity).
2. Allow admins to allot a number of **tickets per user per Event** (not per session) — the ticket count is how many sessions under that event a user may book.
3. Let users log in with **ISB email + PGP ID** (matched against a pre-loaded roster of ~400 users — no signup, no password).
4. Let users view all sessions under an event they're entitled to, see live seat availability, and book up to their ticket limit.
5. Enforce **hard session capacity** — booking closes the instant a session is full.
6. Make bookings **final and unchangeable** by the user once confirmed.
7. Enforce a **booking deadline** per event; after it passes, any unused tickets are **auto-allotted at random** to available (non-full) sessions.
8. Send an **email acknowledgment** immediately after every booking (self-selected or auto-allotted).
9. Persist state across logins — a returning user always sees exactly what they've already booked, and cannot re-book or change it.

## 3. Non-Goals (Out of Scope for MVP)

- Users cancelling, swapping, or editing a confirmed booking (admin can still do this manually as an override).
- Payments / paid tickets.
- Waitlisting once a session is full (session simply shows "Full").
- Native mobile app (a responsive web app is sufficient).
- Self-service signup — the user roster is pre-loaded by admins only.
- SSO/OAuth with ISB's identity system (deferred; MVP uses roster-matched lookup, see §7.2).

---

## 4. Personas

| Persona | Description |
|---|---|
| **CAC Admin** | Creates events & sessions, uploads/manages the 400-user roster and ticket allotments, monitors bookings, triggers auto-allocation, handles exceptions. |
| **ISB Participant (User)** | PGP student with a fixed ticket allotment per event; logs in to browse and book sessions. |

---

## 5. Core Concepts & Data Model

```
User
 - id
 - name
 - isb_email (unique)
 - pgp_id (unique)
 - is_admin (bool)
 - created_at

Event                          (e.g., "OCC 2026")
 - id
 - name
 - description
 - start_date, end_date        (spans multiple days)
 - booking_deadline (datetime)
 - status: draft | published | closed
 - created_by (admin user_id)
 - created_at

EventTicketAllotment           (how many tickets THIS user has for THIS event)
 - id
 - event_id
 - user_id
 - tickets_allotted (int)      (e.g., 2)
 - created_at

Session                        (a bookable slot under an Event)
 - id
 - event_id
 - title
 - description
 - day_label                   (e.g., "Day 1")
 - session_date
 - start_time, end_time
 - venue_name
 - venue_location
 - capacity (int)              (max bookings; may equal or be lower than venue's physical capacity)
 - speaker_profile_id
 - speaker_description
 - status: open | closed | cancelled
 - created_at

Booking
 - id
 - user_id
 - event_id
 - session_id
 - booking_type: self_selected | auto_allotted
 - booked_at
 - status: confirmed | cancelled_by_admin

AcknowledgmentLog
 - id
 - booking_id
 - channel: email
 - sent_at
 - status: sent | failed
```

**Key relationship:** tickets are allotted at the **Event** level. A user with 2 tickets for OCC can book **any 2 sessions** under OCC (subject to capacity and, if enabled, time-conflict rules) — not 2 tickets per session.

---

## 6. Functional Requirements

### 6.1 Admin Side

**Event management**
- Create/edit/delete an Event: name, description, start date, end date, booking deadline, status (draft/published/closed).
- Only `published` events are visible to users.

**Session management**
- Under a given Event, create/edit/delete Sessions with: title, description, day label, date, start/end time, venue name, venue location, capacity, speaker profile ID, speaker description.
- View live fill-rate per session (e.g., "48/70 booked").
- Mark a session `cancelled` (existing bookings for it should be flagged for admin follow-up, not silently deleted).

**Roster & ticket allotment**
- Bulk-upload the ~400 users (name, ISB email, PGP ID) via CSV, or seed directly in the backend at launch.
- Set ticket allotment per user per event — either a uniform default for all users (e.g., "everyone gets 2 tickets for OCC") with the ability to override specific users, or a full CSV upload of `pgp_id, event, tickets`.
- View which users have/haven't used all their tickets.

**Booking oversight**
- Dashboard: bookings per session, per event, overall fill %, list of users who haven't booked yet.
- Export attendee list per session (for badge printing / venue headcount).
- Manually create, reassign, or cancel a booking on a user's behalf (support/exception handling — e.g., correcting an error). This is an **admin-only override**; users themselves cannot edit bookings.

**Deadline & auto-allocation**
- View countdown/status of each event's booking deadline.
- **Trigger auto-allocation** (recommended as a manual admin-clicked action for MVP, see §8.4) for all users who haven't used their full ticket allotment once the deadline has passed.
- Review a summary of what was auto-allotted before/after running it.

**Admin authentication**
- Simple separate admin login (kept lightweight given the no-cost/prototype constraint — e.g., a fixed admin email/PGP ID flag on the roster, or a basic hardcoded credential for MVP). See §7.2.

### 6.2 User Side

**Login**
- User enters **ISB email** and **PGP ID**. System checks this pair against the pre-loaded roster.
  - Match found → logged in, session/cookie created.
  - No match → clear error ("We couldn't find your details. Please check your ISB email and PGP ID, or contact CAC.").
- No password, no OTP, no signup — matches the no-cost MVP constraint you specified.

**Event & session browsing**
- After login, show all `published` events the user has a ticket allotment for, with: event name, dates, total tickets allotted, tickets remaining.
- Inside an event, show all sessions grouped by day, each with: title, description, date/time, venue name & location, speaker profile ID + description, capacity, live seats remaining, and a **Book** button.
- If a session is full → button shows disabled state, e.g. "Full."
- If the user has already booked a session → that session shows "Booked ✓" and cannot be un-booked or changed.
- If the user has used all their tickets for the event → remaining unbooked sessions show a disabled "No tickets remaining" state.
- If the booking deadline has passed and the user still had unused tickets → show what was auto-allotted to them, clearly labeled (e.g., "Auto-assigned").

**Booking flow**
1. User clicks **Book** on a session.
2. System re-validates in real time: (a) user still has a ticket remaining for this event, (b) session still has capacity, (c) user hasn't already booked this exact session, (d) [if enabled] session doesn't clash with another session the user already booked in the same time slot.
3. If all checks pass → booking is created, one ticket is deducted, session's remaining-capacity counter decrements.
4. Confirmation shown on screen + confirmation email sent immediately (see §6.3).
5. Booking is now locked — no edit/cancel option is shown to the user.

**Returning user**
- On every login, the user's dashboard always reflects true current state — already-booked sessions, tickets remaining, and locked-out options — pulled fresh from the database (not cached client-side), so there's no way to "re-book" or change a prior choice.

### 6.3 Notifications

- On every successful booking (self-selected or auto-allotted), send an email acknowledgment to the user's ISB email containing: event name, session title, date/time, venue name & location, speaker info, and a note that this booking is final.
- Use a free-tier transactional email provider (e.g., Resend, SendGrid free tier, or platform-native email if using Replit) to keep this at zero cost for the pilot.
- Log every send attempt (success/failure) so admins can spot delivery issues.

---

## 7. Business Rules & Edge Cases

1. **Ticket scope:** Tickets are per Event, not per Session. A user with 2 OCC tickets can book any 2 of OCC's sessions (Day 1 + Day 2, or two on the same day, etc.), governed by rule 4 below.
2. **Hard capacity:** A session can never accept more bookings than its `capacity`. This must be enforced atomically at the database level (not just in the UI) to avoid race conditions when many users book at once.
3. **Immutability:** Once `status = confirmed`, a booking cannot be changed or cancelled by the user. Only an admin can override it.
4. **Time-conflict rule (assumption — flagged for your confirmation):** Since a conference typically runs parallel tracks, we recommend preventing a user from booking two sessions in the *same event* that overlap in date/time — this avoids someone "winning" two sessions they physically can't attend. We suggest this be **admin-configurable per event** (an on/off toggle), defaulting to **ON**. Please confirm if you want this, or if sessions never overlap in practice and this rule is unnecessary.
5. **Deadline enforcement:** Once `booking_deadline` has passed, the self-service **Book** button is disabled for that event, even if a session still has open seats.
6. **Auto-allotment logic (post-deadline):** For every user with unused tickets on a closed event:
   - Randomly select from sessions that are (a) still under capacity, and (b) not already booked by that user, and (c) not time-conflicting with a session they already hold (if rule 4 is on).
   - Repeat until the user's remaining tickets are used or no eligible sessions remain.
   - Create each as a `booking_type = auto_allotted` record, deduct the ticket, send the acknowledgment email — same as a self-selected booking.
7. **Roster integrity:** ISB email + PGP ID must uniquely identify one user; duplicate or unmatched entries should be caught at CSV-upload time, not at login time.
8. **Admin cancels a session:** Existing bookings for that session are flagged; admins are notified to manually reassign or refund the ticket (does not auto-reassign, to avoid silently double-booking someone).

---

## 8. Non-Functional Requirements

1. **Scale:** Must comfortably handle ~400 users, a handful of events, and a few dozen sessions per event — this is a small, well-bounded dataset; no need to over-engineer for scale.
2. **Concurrency safety:** Session capacity checks must be race-condition-safe (e.g., a DB transaction/constraint), since many users may try to book the same popular session in the same second.
3. **Zero/near-zero cost:** Since this is being prototyped via vibe coding (e.g., Replit) with no budget, prefer free-tier infrastructure: free database tier, free email-sending tier, no paid auth provider.
4. **Simplicity over automation:** For MVP, trigger auto-allocation via an admin button click rather than a scheduled cron job — this avoids needing always-on background infrastructure (which often isn't free) and gives the admin control over exactly when it runs. Can be automated in a later phase.
5. **Security (lightweight but real):** Even without passwords, don't expose other users' data; a user should only ever see their own bookings/tickets. Admin routes must be gated separately from user routes.
6. **Auditability:** Every booking (self or auto) should be timestamped and attributable, so admins can always answer "who booked what, and when."
7. **Mobile-friendly:** Most PGP students will access this from their phones between classes — the booking UI must work well on small screens.

---

## 9. Success Metrics (for this pilot)

- 100% of the 400 users have a final session assignment by the time each event starts (either self-booked or auto-allotted).
- Zero instances of a session exceeding its stated capacity.
- Zero instances of a user being able to double-book or edit a confirmed booking.
- Acknowledgment email delivered for >95% of bookings.

---

## 10. Assumptions Made (please review)

- Tickets are allotted per Event (confirmed by you), and a user can spread them across any sessions under that event.
- Login is a simple roster lookup (ISB email + PGP ID), no password/OTP, to avoid cost — confirmed by you as the direction given budget constraints.
- Auto-allocation is admin-triggered (button), not an automatic cron job, for MVP simplicity and zero infra cost.
- Same-event, overlapping-time sessions are mutually exclusive by default (flagged above in §7.4 — please confirm).
- No waitlist for full sessions in MVP; a full session simply shows as unavailable.
- Admin accounts are a small, separate, trusted group — lightweight admin auth is acceptable for the pilot.

## 11. Future Enhancements (Post-MVP)

- Allow limited self-service swaps within a short grace window before the deadline.
- Waitlist + auto-promote when a spot opens up (e.g., admin cancels someone).
- Calendar (.ics) invite attached to the acknowledgment email.
- Automated (cron-based) auto-allocation instead of admin-triggered.
- Proper SSO with ISB's identity provider.
- Analytics dashboard (attendance trends across events, no-show tracking).
