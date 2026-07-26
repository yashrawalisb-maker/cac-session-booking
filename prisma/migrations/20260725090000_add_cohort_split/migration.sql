-- Additive only: new roster field for the mandatory-attendance cohort split (e.g. "G1"/"G2"),
-- distinct from the existing study_group column.

ALTER TABLE "users" ADD COLUMN "cohort_split" TEXT;
