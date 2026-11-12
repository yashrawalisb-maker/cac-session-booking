-- CreateEnum
CREATE TYPE "TravelStage" AS ENUM ('BUS', 'AIRPORT', 'GATE');

-- CreateEnum
CREATE TYPE "TravelScanMethod" AS ENUM ('qr', 'manual');

-- CreateTable
CREATE TABLE "travel_slots" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "flight_no" TEXT,
    "departure_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_checkpoints" (
    "id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "stage" "TravelStage" NOT NULL,
    "label" TEXT,

    CONSTRAINT "travel_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot_id" TEXT,
    "bus_number" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_scans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "scanned_by" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL,
    "method" "TravelScanMethod" NOT NULL DEFAULT 'qr',
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_coordinators" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checkpoint_id" TEXT,
    "granted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_coordinators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "travel_checkpoints_slot_id_stage_key" ON "travel_checkpoints"("slot_id", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "travel_assignments_user_id_key" ON "travel_assignments"("user_id");

-- CreateIndex
CREATE INDEX "travel_assignments_slot_id_idx" ON "travel_assignments"("slot_id");

-- CreateIndex
CREATE INDEX "travel_scans_checkpoint_id_idx" ON "travel_scans"("checkpoint_id");

-- CreateIndex
CREATE INDEX "travel_scans_updated_at_idx" ON "travel_scans"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "travel_scans_user_id_checkpoint_id_key" ON "travel_scans"("user_id", "checkpoint_id");

-- CreateIndex
CREATE UNIQUE INDEX "travel_coordinators_user_id_key" ON "travel_coordinators"("user_id");

-- AddForeignKey
ALTER TABLE "travel_checkpoints" ADD CONSTRAINT "travel_checkpoints_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "travel_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_assignments" ADD CONSTRAINT "travel_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_assignments" ADD CONSTRAINT "travel_assignments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "travel_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_scans" ADD CONSTRAINT "travel_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_scans" ADD CONSTRAINT "travel_scans_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "travel_checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_scans" ADD CONSTRAINT "travel_scans_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_coordinators" ADD CONSTRAINT "travel_coordinators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_coordinators" ADD CONSTRAINT "travel_coordinators_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "travel_checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_coordinators" ADD CONSTRAINT "travel_coordinators_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

