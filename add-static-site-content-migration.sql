-- Migration to add lastContent column for static site monitoring
-- Run this manually or through Prisma migrate

ALTER TABLE sources ADD COLUMN last_content TEXT;

-- Add comment for documentation
COMMENT ON COLUMN sources.last_content IS 'Markdown content for Website type sources, used for change detection';