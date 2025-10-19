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

    // Sort items by publication date (newest first)
    // RSS feeds don't always provide items in chronological order (e.g., HN sorts by score)
    const sortedItems = [...feed.items].sort((a, b) => {
      const dateA = new Date(a.pubDate || a.isoDate || a.published || 0);
      const dateB = new Date(b.pubDate || b.isoDate || b.published || 0);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });

    // Process items to find new ones
    const newItems: any[] = [];

    for (const item of sortedItems) {
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
    if (!isFirstPoll && newItems.length > 0) {
      // Prepare event data for batch insert
      const eventsToCreate = newItems.map(item => {
        const publishedAt = item.pubDate || item.isoDate || item.published;
        const publishedDate = publishedAt ? new Date(publishedAt) : null;

        return {
          title: item.title || 'Untitled',
          summary: item.contentSnippet || item.content || item.description || null,
          eventUrl: item.link || null,
          topicId: source.topicId,
          publishedAt: publishedDate,
          unread: true
        };
      });

      try {
        // Batch insert all events at once for better performance
        const result = await prisma.event.createMany({
          data: eventsToCreate,
          skipDuplicates: true // Skip if eventUrl already exists (if unique constraint added)
        });
        createdCount = result.count;
      } catch (error) {
        console.error(`Failed to create events for source ${source.id}:`, error);
        // Fall back to individual inserts if batch fails
        for (const item of newItems) {
          try {
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
      }
    } else if (isFirstPoll) {
      console.log(`[RSS Poller] First poll for source ${source.id} - skipping ${newItems.length} existing items`);
    }

    // Update source metadata with the newest item's GUID
    const newestItemGuid = sortedItems[0]?.guid || sortedItems[0]?.link || '';
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
