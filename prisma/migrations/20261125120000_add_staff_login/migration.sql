-- CAC staff accounts (ID + password sign-in for the Travel overview). Additive only:
-- existing users get is_staff = false and no password.
ALTER TABLE "users" ADD COLUMN "is_staff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "password_hash" TEXT;
