import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { evaluateStaticSiteChange } from '@/lib/ai';
import crypto from 'crypto';

interface StaticSitePollingResult {
    polled: number;
    successful: number;
    failed: number;
    changesDetected: number;
    eventsCreated: number;
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
    hasChanges: boolean;
    eventCreated: boolean;
    error?: string;
}

function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
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

export async function pollStaticSites(): Promise<StaticSitePollingResult> {
    const startTime = Date.now();
    const results: ProcessedSource[] = [];

    const sourcesToPoll = await prisma.source.findMany({
        where: {
            type: 'Static Page',
            OR: [
                { lastFetchedAt: null },
                {
                    lastFetchedAt: {
                        lt: new Date(Date.now() - 1 * 60 * 1000)
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

    console.log(`[Static Site Poller] Found ${sourcesToPoll.length} Static Page sources to poll`);

    for (const source of sourcesToPoll) {
        try {
            const result = await processSingleStaticSite(source);
            results.push(result);
        } catch (error) {
            results.push({
                sourceId: source.id,
                success: false,
                hasChanges: false,
                eventCreated: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const changesDetected = results.filter(r => r.hasChanges).length;
    const eventsCreated = results.filter(r => r.eventCreated).length;
    const errors = results
        .filter(r => !r.success)
        .map(r => {
            const source = sourcesToPoll.find((s: any) => s.id === r.sourceId);
            return {
                sourceId: r.sourceId,
                sourceUrl: source?.sourceUrl || 'unknown',
                error: r.error || 'Unknown error'
            };
        });

    const duration = (Date.now() - startTime) / 1000;

    console.log(`[Static Site Poller] Completed: ${successful} successful, ${failed} failed, ${changesDetected} changes detected, ${eventsCreated} events created in ${duration}s`);

    return {
        polled: sourcesToPoll.length,
        successful,
        failed,
        changesDetected,
        eventsCreated,
        errors,
        duration
    };
}

async function processSingleStaticSite(source: SourceWithTopic): Promise<ProcessedSource> {
    console.log(`[Static Site Poller] ========================================`);
    console.log(`[Static Site Poller] Processing source ${source.id}: ${source.sourceUrl}`);

    try {
        const newContent = await scrapeWithFirecrawl(source.sourceUrl);

        if (!newContent) {
            console.log(`[Static Site Poller] No content returned for source ${source.id}`);
            await prisma.source.update({
                where: { id: source.id },
                data: { lastFetchedAt: new Date() }
            });

            return {
                sourceId: source.id,
                success: true,
                hasChanges: false,
                eventCreated: false
            };
        }

        const newContentHash = hashContent(newContent);
        console.log(`[Static Site Poller] New content hash: ${newContentHash}`);
        console.log(`[Static Site Poller] New content length: ${newContent.length} characters`);

        let hasChanges = false;

        const conversationMessages = (source.topic.conversationMessages || []).map(message => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content
        }));

        if (!source.lastContent) {
            console.log(`[Static Site Poller] First scrape for source ${source.id} - storing initial content`);
            console.log(`[Static Site Poller] Initial content preview (first 200 chars): ${newContent.substring(0, 200)}...`);

            await prisma.source.update({
                where: { id: source.id },
                data: {
                    lastContent: newContent,
                    lastFetchedAt: new Date()
                }
            });

            hasChanges = false;
        } else {
            const oldContentHash = hashContent(source.lastContent);
            console.log(`[Static Site Poller] Old content hash: ${oldContentHash}`);
            console.log(`[Static Site Poller] Old content length: ${source.lastContent.length} characters`);

            // Simple string comparison to detect changes
            hasChanges = source.lastContent !== newContent;

            if (hasChanges) {
                console.log(`[Static Site Poller] ⚠️  CHANGES DETECTED for source ${source.id} (${source.sourceUrl})`);
                console.log(`[Static Site Poller] Hash comparison: ${oldContentHash} -> ${newContentHash}`);
                console.log(`[Static Site Poller] Length change: ${source.lastContent.length} -> ${newContent.length} (diff: ${newContent.length - source.lastContent.length})`);
                console.log(`[Static Site Poller] --- OLD CONTENT (first 500 chars) ---`);
                console.log(source.lastContent.substring(0, 500));
                console.log(`[Static Site Poller] --- NEW CONTENT (first 500 chars) ---`);
                console.log(newContent.substring(0, 500));
                console.log(`[Static Site Poller] --- END CONTENT COMPARISON ---`);

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

                let eventCreated = false;

                try {
                    console.log(`[Static Site Poller] Sending to AI for evaluation...`);
                    console.log(`[Static Site Poller] Topic prompt: ${source.topic.prompt}`);
                    console.log(`[Static Site Poller] Previous events count: ${eventsForContext.length}`);
                    console.log(`[Static Site Poller] Conversation messages count: ${conversationMessages.length}`);

                    const evaluation = await evaluateStaticSiteChange({
                        topicPrompt: source.topic.prompt,
                        conversation: conversationMessages,
                        previousEvents: eventsForContext,
                        change: {
                            sourceUrl: source.sourceUrl,
                            oldContent: source.lastContent,
                            newContent
                        }
                    });

                    console.log(`[Static Site Poller] AI evaluation completed`);
                    console.log(`[Static Site Poller] matchesUserPrompt: ${evaluation.matchesUserPrompt}`);
                    console.log(`[Static Site Poller] notificationName: ${evaluation.notificationName}`);
                    console.log(`[Static Site Poller] notificationDescription: ${evaluation.notificationDescription}`);

                    if (!evaluation.matchesUserPrompt) {
                        console.log(`[Static Site Poller] ❌ Agent rejected change for source ${source.id}`);
                    } else {
                        const notificationTitle = evaluation.notificationName?.trim();
                        const notificationSummary = evaluation.notificationDescription?.trim() || null;

                        if (!notificationTitle) {
                            throw new Error('Agent returned matchesUserPrompt=true without notificationName');
                        }

                        console.log(`[Static Site Poller] ✅ Creating event...`);
                        console.log(`[Static Site Poller] Event title: ${notificationTitle}`);
                        console.log(`[Static Site Poller] Event summary: ${notificationSummary}`);

                        const now = new Date();
                        await prisma.event.create({
                            data: {
                                topicId: source.topicId,
                                title: notificationTitle,
                                summary: notificationSummary,
                                eventUrl: source.sourceUrl,
                                publishedAt: now,
                                unread: true
                            }
                        });

                        console.log(`[Static Site Poller] ✅ Created agent-approved event for source ${source.id}`);
                        eventCreated = true;
                    }
                } catch (error) {
                    console.error(`[Static Site Poller] Agent evaluation failed for source ${source.id}:`, error);
                    throw error;
                }

                console.log(`[Static Site Poller] Updating source with new content...`);
                await prisma.source.update({
                    where: { id: source.id },
                    data: {
                        lastContent: newContent,
                        lastFetchedAt: new Date()
                    }
                });
                console.log(`[Static Site Poller] Source ${source.id} updated successfully`);

                return {
                    sourceId: source.id,
                    success: true,
                    hasChanges,
                    eventCreated
                };
            } else {
                console.log(`[Static Site Poller] ✓ No changes detected for source ${source.id}`);
                console.log(`[Static Site Poller] Content hash matches: ${oldContentHash}`);

                await prisma.source.update({
                    where: { id: source.id },
                    data: { lastFetchedAt: new Date() }
                });
            }
        }

        console.log(`[Static Site Poller] Completed processing source ${source.id}`);
        return {
            sourceId: source.id,
            success: true,
            hasChanges,
            eventCreated: false
        };

    } catch (error) {
        console.error(`[Static Site Poller] ❌ Error processing source ${source.id} (${source.sourceUrl}):`, error);
        if (error instanceof Error) {
            console.error(`[Static Site Poller] Error message: ${error.message}`);
            console.error(`[Static Site Poller] Error stack: ${error.stack}`);
        }

        return {
            sourceId: source.id,
            success: false,
            hasChanges: false,
            eventCreated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    } finally {
        console.log(`[Static Site Poller] ========================================`);
    }
}

async function scrapeWithFirecrawl(url: string): Promise<string | null> {
    console.log(`[Static Site Poller] Scraping URL with Firecrawl: ${url}`);
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

    if (!firecrawlApiKey) {
        throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    const firecrawlUrl = 'https://api.firecrawl.dev/v2/scrape';
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: url,
            onlyMainContent: false,
            maxAge: 172800000,
            parsers: ['pdf'],
            formats: ['markdown']
        })
    };

    try {
        console.log(`[Static Site Poller] Sending request to Firecrawl API...`);
        const response = await fetch(firecrawlUrl, options);

        if (!response.ok) {
            console.error(`[Static Site Poller] Firecrawl API returned error status: ${response.status}`);
            throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[Static Site Poller] Firecrawl API response received`);
        console.log(`[Static Site Poller] Success: ${data.success}, Has data: ${!!data.data}, Has markdown: ${!!(data.data?.markdown)}`);

        if (data.success && data.data && data.data.markdown) {
            console.log(`[Static Site Poller] Successfully scraped ${url} - content length: ${data.data.markdown.length}`);
            return data.data.markdown;
        } else {
            console.warn(`[Static Site Poller] Firecrawl returned no markdown content for ${url}:`, JSON.stringify(data, null, 2));
            return null;
        }
    } catch (error) {
        console.error(`[Static Site Poller] ❌ Firecrawl API error for ${url}:`, error);
        if (error instanceof Error) {
            console.error(`[Static Site Poller] Error details: ${error.message}`);
        }
        throw error;
    }
}
