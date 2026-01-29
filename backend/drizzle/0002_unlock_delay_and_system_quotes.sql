-- Add unlock_requested_at column to blocked_sites for 6-hour delay feature
ALTER TABLE "blocked_sites" ADD COLUMN "unlock_requested_at" timestamp;

-- Make user_id nullable in quotes for system quotes
ALTER TABLE "quotes" ALTER COLUMN "user_id" DROP NOT NULL;

-- Add is_system column to quotes
ALTER TABLE "quotes" ADD COLUMN "is_system" boolean DEFAULT false;
