-- Migration: Add published_at field to events table
-- This adds a timestamp for when the event was originally published (from RSS feed)

BEGIN;

-- Add the published_at column (nullable, as existing events won't have it)
ALTER TABLE "events"
  ADD COLUMN "published_at" TIMESTAMP(3);

-- Create index for efficient sorting by publication date
CREATE INDEX "events_published_at_idx" ON "events"("published_at" DESC);

COMMIT;
