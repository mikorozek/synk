-- Migration: Add unread field to events table
-- This adds a boolean field to track whether an event has been read by the user

-- Add the unread column with default value of true
ALTER TABLE "events" ADD COLUMN "unread" BOOLEAN NOT NULL DEFAULT true;

-- Create index on unread column for efficient filtering
CREATE INDEX "events_unread_idx" ON "events"("unread");

-- Optional: Set existing events as read (if you want old events to be marked as read)
-- Uncomment the line below if you want this behavior:
-- UPDATE "events" SET "unread" = false WHERE "created_at" < NOW();
