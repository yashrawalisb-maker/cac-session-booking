-- Additive only: structured club tag for sessions (values from lib/clubs.ts CLUBS).
ALTER TABLE "sessions" ADD COLUMN "club" TEXT;
