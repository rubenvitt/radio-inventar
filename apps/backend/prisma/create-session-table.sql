-- Create session table for connect-pg-simple
-- This table is used to store express-session data in PostgreSQL

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

-- Add primary key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
  END IF;
END$$;

-- Create index on expire column for efficient cleanup
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
