/*
  Warnings:

  - You are about to alter the column `deviceId` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(25)`.

*/
-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_deviceId_fkey";

-- AlterTable
ALTER TABLE "Loan" ALTER COLUMN "deviceId" SET DATA TYPE VARCHAR(25);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "Loan_borrowedAt_idx" ON "Loan"("borrowedAt");

-- CreateIndex
CREATE INDEX "Loan_returnedAt_idx" ON "Loan"("returnedAt");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
