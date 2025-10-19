-- ============================================
-- Topic Conversation History Migration
-- ============================================
-- Creates table to persist the full conversation
-- for each topic so downstream automations can
-- leverage the historical context.
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
