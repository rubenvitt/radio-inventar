-- Loans moved to radio-admin (the loan system of record). radio-inventar is now
-- a thin client over radio-admin's loan API and no longer stores loans locally.
-- Dropping the table also drops all of its indexes, including the hand-added
-- partial unique index `loans_device_active_uidx`.
--
-- Run order: this migration must be deployed only AFTER the application code
-- that still referenced `prisma.loan` has been removed (Phase 4), otherwise the
-- regenerated Prisma client loses `.loan` and the build breaks.
DROP TABLE "Loan";
