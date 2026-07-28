-- Multi-speaker support: JSON array of { name, role, photoUrl, bio, profileUrl } per session.
-- Nullable and additive; existing rows keep NULL and fall back to the flat speaker_* columns.
ALTER TABLE "sessions" ADD COLUMN "speakers" JSONB;
