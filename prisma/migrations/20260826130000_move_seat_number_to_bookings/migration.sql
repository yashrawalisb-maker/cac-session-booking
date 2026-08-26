-- Seat numbers move from a global per-user field to a per-session field on bookings, since
-- different sessions can reuse the same venue with a different seating layout (or a different
-- venue altogether). The one seating chart already imported was for the "Accenture PPT" session,
-- so its data is carried over to that session's confirmed bookings before the old column is
-- dropped — every other session starts with no seat data until a chart is uploaded for it.
ALTER TABLE "bookings" ADD COLUMN "seat_number" TEXT;

UPDATE "bookings" b
SET "seat_number" = u."seat_number"
FROM "users" u, "sessions" s
WHERE b."user_id" = u."id"
  AND b."session_id" = s."id"
  AND s."title" = 'Accenture PPT'
  AND b."status" = 'confirmed'
  AND u."seat_number" IS NOT NULL;

ALTER TABLE "users" DROP COLUMN "seat_number";
