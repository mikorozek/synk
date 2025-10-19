-- ============================================
-- Combined Migration: RSS Polling + Unread Events
-- ============================================
-- This migration adds:
-- 1. RSS polling fields to sources table (last_fetched_at, last_item_guid)
-- 2. Unread field to events table
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
-- Verification Queries (run these to verify)
-- ============================================

-- Check sources table structure
-- \d sources

-- Check events table structure
-- \d events

-- List all indexes
-- \di
