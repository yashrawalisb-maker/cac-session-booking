-- Additive only: venue seat number per student, imported from an admin-provided seating-chart
-- spreadsheet and matched by PGID. See lib/seating.ts.
ALTER TABLE "users" ADD COLUMN "seat_number" TEXT;
