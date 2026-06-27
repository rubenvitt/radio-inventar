/*
  Warnings:

  - You are about to drop the `Device` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `snapshotCallSign` to the `Loan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_deviceId_fkey";

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "snapshotCallSign" VARCHAR(50) NOT NULL,
ADD COLUMN     "snapshotDeviceType" VARCHAR(100),
ADD COLUMN     "snapshotSerialNumber" VARCHAR(100);

-- DropTable
DROP TABLE "Device";

-- DropEnum
DROP TYPE "DeviceStatus";

-- Partial unique index: at most one ACTIVE loan (returnedAt IS NULL) per device.
-- Prisma cannot express partial indexes in schema.prisma, so it is maintained
-- here by hand. This is the atomic guard against two concurrent loans of the
-- same device (a second INSERT hits a unique violation -> 409). IF NOT EXISTS
-- keeps re-runs idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS "loans_device_active_uidx" ON "Loan" ("deviceId") WHERE "returnedAt" IS NULL;
