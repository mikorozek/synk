import Parser from 'rss-parser';
import { prisma } from '@/lib/db';

const parser = new Parser();

interface RSSPollingResult {
  polled: number;
  successful: number;
  failed: number;
  newEvents: number;
  errors: Array<{
    sourceId: number;
    sourceUrl: string;
    error: string;
  }>;
  duration: number;
}

interface ProcessedSource {
  sourceId: number;
  success: boolean;
  newEventsCount: number;
  error?: string;
}

export async function pollRSSSources(): Promise<RSSPollingResult> {
  const startTime = Date.now();
  const results: ProcessedSource[] = [];

  // Find RSS sources that need polling
  const sourcesToPoll = await prisma.source.findMany({
    where: {
      type: 'RSS',
      OR: [
        { lastFetchedAt: null }, // Never fetched
        {
          lastFetchedAt: {
            lt: new Date(Date.now() - 15 * 60 * 1000) // > 15 minutes ago
          }
        }
      ]
    },
    include: {
      topic: true // Include topic for context
    }
  });

  // Process each source
  for (const source of sourcesToPoll) {
    try {
      const result = await processSingleSource(source);
      results.push(result);
    } catch (error) {
      results.push({
        sourceId: source.id,
        success: false,
        newEventsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Calculate summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const newEvents = results.reduce((sum, r) => sum + r.newEventsCount, 0);
  const errors = results
    .filter(r => !r.success)
    .map(r => {
      const source = sourcesToPoll.find(s => s.id === r.sourceId);
      return {
        sourceId: r.sourceId,
        sourceUrl: source?.sourceUrl || 'unknown',
        error: r.error || 'Unknown error'
      };
    });

  const duration = (Date.now() - startTime) / 1000;

  return {
    polled: sourcesToPoll.length,
    successful,
    failed,
    newEvents,
    errors,
    duration
  };
}

async function processSingleSource(source: any): Promise<ProcessedSource> {
  try {
    // Fetch and parse RSS feed
    const feed = await parser.parseURL(source.sourceUrl);

    if (!feed.items || feed.items.length === 0) {
      // Update lastFetchedAt even if no items
      await prisma.source.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() }
      });

      return {
        sourceId: source.id,
        success: true,
        newEventsCount: 0
      };
    }

    // Check if this is the first poll (never polled before)
    const isFirstPoll = !source.lastItemGuid;

    // Process items in reverse chronological order (newest first)
    const newItems: any[] = [];

    for (const item of feed.items) {
      // Use GUID or link as identifier
      const itemGuid = item.guid || item.link || '';

      // Stop when we hit the last processed item
      if (source.lastItemGuid && itemGuid === source.lastItemGuid) {
        break;
      }

      newItems.push(item);
    }

    // Create events for new items (skip on first poll to avoid old items)
    let createdCount = 0;
    if (!isFirstPoll) {
      for (const item of newItems) {
        try {
          // Parse publication date from RSS item
          const publishedAt = item.pubDate || item.isoDate || item.published;
          const publishedDate = publishedAt ? new Date(publishedAt) : null;

          await prisma.event.create({
            data: {
              title: item.title || 'Untitled',
              summary: item.contentSnippet || item.content || item.description || null,
              eventUrl: item.link || null,
              topicId: source.topicId,
              publishedAt: publishedDate,
              unread: true
            }
          });
          createdCount++;
        } catch (error) {
          console.error(`Failed to create event for item: ${item.title}`, error);
          // Continue processing other items
        }
      }
    } else {
      console.log(`[RSS Poller] First poll for source ${source.id} - skipping ${newItems.length} existing items`);
    }

    // Update source metadata
    const newestItemGuid = feed.items[0]?.guid || feed.items[0]?.link || '';
    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        lastItemGuid: newestItemGuid || source.lastItemGuid
      }
    });

    return {
      sourceId: source.id,
      success: true,
      newEventsCount: createdCount
    };

  } catch (error) {
    // Log error but don't update lastFetchedAt (will retry on next poll)
    console.error(`Error processing source ${source.id} (${source.sourceUrl}):`, error);

    return {
      sourceId: source.id,
      success: false,
      newEventsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
