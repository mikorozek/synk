import Parser from 'rss-parser';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { evaluateRssItemRelevance } from '@/lib/ai';

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

type SourceWithTopic = Prisma.SourceGetPayload<{
  include: {
    topic: {
      include: {
        conversationMessages: true;
      };
    };
  };
}>;

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
      topic: {
        include: {
          conversationMessages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      }
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

async function processSingleSource(source: SourceWithTopic): Promise<ProcessedSource> {
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
    const conversationMessages = (source.topic.conversationMessages || []).map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    }));

    let createdCount = 0;
    if (!isFirstPoll && newItems.length > 0) {
      const previousEvents = await prisma.event.findMany({
        where: { topicId: source.topicId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const eventsForContext = previousEvents.map(event => ({
        title: event.title,
        summary: event.summary,
        url: event.eventUrl
      }));

      const itemsToProcess = [...newItems].reverse();

      for (const item of itemsToProcess) {
        const publishedAtRaw = item.pubDate || item.isoDate || item.published;
        const publishedDate = publishedAtRaw ? new Date(publishedAtRaw) : null;

        try {
          const evaluation = await evaluateRssItemRelevance({
            topicPrompt: source.topic.prompt,
            conversation: conversationMessages,
            previousEvents: eventsForContext,
            rssItem: {
              title: item.title,
              summary: item.contentSnippet || item.description || item.content || null,
              content: item.content || item.contentSnippet || item.description || null,
              url: item.link || null,
              publishedAt: publishedDate ? publishedDate.toISOString() : null
            }
          });

          if (!evaluation.matchesUserPrompt) {
            continue;
          }

          const notificationTitle = evaluation.notificationName?.trim();
          const notificationSummary = evaluation.notificationDescription?.trim() || null;

          if (!notificationTitle) {
            throw new Error('Agent returned matchesUserPrompt=true without notificationName');
          }

          const createdEvent = await prisma.event.create({
            data: {
              title: notificationTitle,
              summary: notificationSummary,
              eventUrl: item.link || null,
              topicId: source.topicId,
              publishedAt: publishedDate,
              unread: true
            }
          });

          createdCount++;

          eventsForContext.unshift({
            title: createdEvent.title,
            summary: createdEvent.summary,
            url: createdEvent.eventUrl
          });

          if (eventsForContext.length > 10) {
            eventsForContext.pop();
          }
        } catch (error) {
          console.error(`[RSS Poller] Failed during agent evaluation for source ${source.id}:`, error);
          throw error;
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
