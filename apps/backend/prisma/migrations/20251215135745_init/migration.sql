-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('AVAILABLE', 'ON_LOAN', 'DEFECT', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "callSign" VARCHAR(50) NOT NULL,
    "serialNumber" VARCHAR(100),
    "deviceType" VARCHAR(100) NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "borrowerName" VARCHAR(100) NOT NULL,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "returnNote" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_callSign_key" ON "Device"("callSign");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Loan_deviceId_idx" ON "Loan"("deviceId");

-- CreateIndex
CREATE INDEX "Loan_borrowerName_idx" ON "Loan"("borrowerName");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
