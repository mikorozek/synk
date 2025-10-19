import { prisma } from '@/lib/db';
import * as fastDiff from 'fast-diff';

interface StaticSitePollingResult {
    polled: number;
    successful: number;
    failed: number;
    changesDetected: number;
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
    error?: string;
}

export async function pollStaticSites(): Promise<StaticSitePollingResult> {
    const startTime = Date.now();
    const results: ProcessedSource[] = [];

    const sourcesToPoll = await prisma.source.findMany({
        where: {
            type: 'Website',
            OR: [
                { lastFetchedAt: null },
                {
                    lastFetchedAt: {
                        lt: new Date(Date.now() - 15 * 60 * 1000)
                    }
                }
            ]
        },
        include: {
            topic: true
        }
    });

    console.log(`[Static Site Poller] Found ${sourcesToPoll.length} Website sources to poll`);

    for (const source of sourcesToPoll) {
        try {
            const result = await processSingleStaticSite(source);
            results.push(result);
        } catch (error) {
            results.push({
                sourceId: source.id,
                success: false,
                hasChanges: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const changesDetected = results.filter(r => r.hasChanges).length;
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

    console.log(`[Static Site Poller] Completed: ${successful} successful, ${failed} failed, ${changesDetected} changes detected in ${duration}s`);

    return {
        polled: sourcesToPoll.length,
        successful,
        failed,
        changesDetected,
        errors,
        duration
    };
}

async function processSingleStaticSite(source: any): Promise<ProcessedSource> {
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
                hasChanges: false
            };
        }

        let hasChanges = false;

        if (!source.lastContent) {
            console.log(`[Static Site Poller] First scrape for source ${source.id} - storing initial content`);

            await prisma.source.update({
                where: { id: source.id },
                data: {
                    lastContent: newContent,
                    lastFetchedAt: new Date()
                }
            });

            hasChanges = false;
        } else {
            const diff = fastDiff(source.lastContent, newContent);
            hasChanges = diff.some(([operation]: [number, string]) => operation !== fastDiff.EQUAL);

            if (hasChanges) {
                console.log(`[Static Site Poller] Changes detected for source ${source.id} (${source.sourceUrl})`);
                console.log(`[Static Site Poller] Diff summary:`);

                logLineLevelDiff(source.lastContent, newContent);

                await prisma.source.update({
                    where: { id: source.id },
                    data: {
                        lastContent: newContent,
                        lastFetchedAt: new Date()
                    }
                });
            } else {
                console.log(`[Static Site Poller] No changes detected for source ${source.id}`);

                await prisma.source.update({
                    where: { id: source.id },
                    data: { lastFetchedAt: new Date() }
                });
            }
        }

        return {
            sourceId: source.id,
            success: true,
            hasChanges
        };

    } catch (error) {
        console.error(`[Static Site Poller] Error processing source ${source.id} (${source.sourceUrl}):`, error);

        return {
            sourceId: source.id,
            success: false,
            hasChanges: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

async function scrapeWithFirecrawl(url: string): Promise<string | null> {
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
        const response = await fetch(firecrawlUrl, options);

        if (!response.ok) {
            throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.markdown) {
            return data.data.markdown;
        } else {
            console.warn(`[Static Site Poller] Firecrawl returned no markdown content for ${url}:`, data);
            return null;
        }
    } catch (error) {
        console.error(`[Static Site Poller] Firecrawl API error for ${url}:`, error);
        throw error;
    }
}

function logLineLevelDiff(oldContent: string, newContent: string): { diffOutput: string } {
    const diff = fastDiff(oldContent, newContent);

    let diffOutput = '';
    let addedLines = 0;
    let removedLines = 0;

    console.log(`[Static Site Poller] === DIFF START ===`);

    for (const [operation, text] of diff) {
        const lines = text.split('\n');

        switch (operation) {
            case fastDiff.INSERT:
                for (const line of lines) {
                    if (line !== '' || lines.length === 1) {
                        const formattedLine = `+ ${line}`;
                        console.log(`[Static Site Poller] ${formattedLine}`);
                        diffOutput += formattedLine + '\n';
                        addedLines++;
                    }
                }
                break;
            case fastDiff.DELETE:
                for (const line of lines) {
                    if (line !== '' || lines.length === 1) {
                        const formattedLine = `- ${line}`;
                        console.log(`[Static Site Poller] ${formattedLine}`);
                        diffOutput += formattedLine + '\n';
                        removedLines++;
                    }
                }
                break;
            case fastDiff.EQUAL:
                break;
        }
    }

    console.log(`[Static Site Poller] === DIFF END ===`);
    console.log(`[Static Site Poller] Summary: +${addedLines} lines added, -${removedLines} lines removed`);

    return { diffOutput: diffOutput.trim() };
}