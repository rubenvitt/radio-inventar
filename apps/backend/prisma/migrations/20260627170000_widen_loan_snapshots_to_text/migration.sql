-- Widen the loan snapshot columns to TEXT (no length cap). The radio-admin
-- source fields are unbounded SQLite text; a VARCHAR cap here would cause a
-- Postgres 22001 ("value too long") on a long rufname/serial/type and leave the
-- device permanently unborrowable. TEXT mirrors the real data contract.
ALTER TABLE "Loan" ALTER COLUMN "snapshotCallSign" SET DATA TYPE TEXT;
ALTER TABLE "Loan" ALTER COLUMN "snapshotSerialNumber" SET DATA TYPE TEXT;
ALTER TABLE "Loan" ALTER COLUMN "snapshotDeviceType" SET DATA TYPE TEXT;
