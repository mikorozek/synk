-- Combined Migration: RSS Polling + Unread Events + Conversation History
-- ============================================
-- 1. RSS polling fields to sources table (last_fetched_at, last_item_guid)
-- 2. Unread field to events table
-- 3. Topic conversation history table
-- ============================================

BEGIN;

-- ============================================
-- Part 1: Add RSS Polling Fields to Sources
-- ============================================

-- Add RSS polling fields to sources table
ALTER TABLE "sources"
  ADD COLUMN "last_fetched_at" TIMESTAMP(3),
  ADD COLUMN "last_item_guid" VARCHAR(500);

-- Create composite index for efficient polling queries
CREATE INDEX "sources_type_last_fetched_at_idx" ON "sources"("type", "last_fetched_at");

-- ============================================
-- Part 2: Add Unread Field to Events
-- ============================================

-- Add unread field to events table
ALTER TABLE "events"
  ADD COLUMN "unread" BOOLEAN NOT NULL DEFAULT true;

-- Create index for efficient filtering of unread events
CREATE INDEX "events_unread_idx" ON "events"("unread");

COMMIT;

-- ============================================
-- Part 3: Topic Conversation History Table
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS "topic_conversation_messages" (
  "id" SERIAL PRIMARY KEY,
  "topic_id" INTEGER NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE,
  "role" VARCHAR(50) NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "topic_conversation_messages_topic_id_idx"
  ON "topic_conversation_messages"("topic_id");

COMMIT;

-- ============================================
-- Verification Queries (run these to verify)
-- ============================================

-- Check sources table structure
-- \d sources

-- Check events table structure
-- \d events

-- Check topic conversation messages table structure
-- \d topic_conversation_messages

-- List all indexes
-- \di
