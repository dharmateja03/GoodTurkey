-- Add access_attempts column to track how many times user tried to access blocked site
ALTER TABLE "blocked_sites" ADD COLUMN IF NOT EXISTS "access_attempts" integer DEFAULT 0;
