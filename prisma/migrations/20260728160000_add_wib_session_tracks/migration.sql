-- Women in Business "table tracks": each WIB session splits into up to 7 tracks, every one a
-- mini-session with its own capacity + speaker. Additive and isolated — non-WIB sessions get no
-- rows here and are unaffected.

CREATE TABLE "session_tracks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "booked_count" INTEGER NOT NULL DEFAULT 0,
    "speaker_name" TEXT,
    "speaker_role" TEXT,
    "speaker_photo_url" TEXT,
    "speaker_bio" TEXT,
    "speaker_profile_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_tracks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_tracks_session_id_track_key" ON "session_tracks"("session_id", "track");
CREATE INDEX "session_tracks_session_id_idx" ON "session_tracks"("session_id");

ALTER TABLE "session_tracks" ADD CONSTRAINT "session_tracks_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Which track a booking is for; null for every non-WIB booking.
ALTER TABLE "bookings" ADD COLUMN "session_track_id" TEXT;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_session_track_id_fkey"
    FOREIGN KEY ("session_track_id") REFERENCES "session_tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
