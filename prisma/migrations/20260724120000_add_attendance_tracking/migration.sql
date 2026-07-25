-- Additive only: attendance-marking permission grants + attendance fields on bookings.

CREATE TABLE "session_attendance_grants" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_attendance_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_attendance_grants_session_id_user_id_key" ON "session_attendance_grants"("session_id", "user_id");

CREATE INDEX "session_attendance_grants_user_id_idx" ON "session_attendance_grants"("user_id");

ALTER TABLE "session_attendance_grants" ADD CONSTRAINT "session_attendance_grants_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_attendance_grants" ADD CONSTRAINT "session_attendance_grants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_attendance_grants" ADD CONSTRAINT "session_attendance_grants_granted_by_fkey"
    FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD COLUMN "attended" BOOLEAN;
ALTER TABLE "bookings" ADD COLUMN "attendance_marked_by" TEXT;
ALTER TABLE "bookings" ADD COLUMN "attendance_marked_at" TIMESTAMP(3);
