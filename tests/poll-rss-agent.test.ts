import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { test } from 'node:test';

import { prisma } from '../lib/db';
import { pollRSSSources } from '../lib/rss-poller';

interface TestServer {
  server: Server;
  url: string;
}

function buildFeed(items: Array<{
  title: string;
  guid: string;
  description: string;
  link: string;
  pubDate: string;
}>): string {
  const itemsXml = items
    .map(
      item => `    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <guid>${item.guid}</guid>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
${itemsXml}
  </channel>
</rss>`;
}

async function startFeedServer(feed: string): Promise<TestServer> {
  const server = createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/rss+xml');
    res.end(feed);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Unable to determine test server address');
  }

  const url = `http://127.0.0.1:${(address as AddressInfo).port}/feed`;
  return { server, url };
}

async function cleanupTopic(topicId: number): Promise<void> {
  await prisma.event.deleteMany({ where: { topicId } });
  await prisma.source.deleteMany({ where: { topicId } });
  await prisma.topicConversationMessage.deleteMany({ where: { topicId } });
  await prisma.topic.delete({ where: { id: topicId } }).catch(() => undefined);
}

const shouldSkip = !process.env.OPENAI_API_KEY;

test('RSS poller creates an event when the agent approves the item', {
  timeout: 180_000,
  skip: shouldSkip
}, async () => {
  const baselineGuid = 'baseline-guid';
  const feed = buildFeed([
    {
      title: 'TypeScript 6.0 Released',
      guid: 'ts-6-0-guid',
      description: 'Official announcement covering new TypeScript compiler improvements and release notes.',
      link: 'https://example.com/typescript-6-release',
      pubDate: new Date().toUTCString()
    },
    {
      title: 'Older Reference Item',
      guid: baselineGuid,
      description: 'Baseline article kept so the poller can stop at the previous GUID.',
      link: 'https://example.com/typescript-baseline',
      pubDate: new Date(Date.now() - 86_400_000).toUTCString()
    }
  ]);

  const { server, url } = await startFeedServer(feed);

  let topicId: number | null = null;
  try {
    const topic = await prisma.topic.create({
      data: {
        title: 'TypeScript Updates',
        prompt: 'Keep me informed about official TypeScript releases and major tooling improvements.'
      }
    });
    topicId = topic.id;

    await prisma.topicConversationMessage.createMany({
      data: [
        {
          topicId: topic.id,
          role: 'user',
          content: 'I only care about official TypeScript releases and their core features.'
        },
        {
          topicId: topic.id,
          role: 'assistant',
          content: 'Understood. I will only surface TypeScript release announcements.'
        }
      ]
    });

    await prisma.source.create({
      data: {
        topicId: topic.id,
        sourceUrl: url,
        type: 'RSS',
        lastFetchedAt: new Date(Date.now() - 20 * 60 * 1000),
        lastItemGuid: baselineGuid
      }
    });

    const pollResult = await pollRSSSources();

    assert.equal(pollResult.failed, 0, 'poller should not mark the source as failed');
    assert.ok(pollResult.newEvents >= 1, 'poller should report at least one new event');

    const events = await prisma.event.findMany({
      where: { topicId: topic.id },
      orderBy: { createdAt: 'desc' }
    });

    assert.ok(events.length > 0, 'agent-approved RSS item should create an event');
    const createdEvent = events[0];
    assert.ok(createdEvent.title.trim().length > 0, 'event title should be populated from agent output');
    assert.ok(createdEvent.summary === null || createdEvent.summary.trim().length > 0, 'event summary should be present when provided by agent');
  } finally {
    server.close();
    if (topicId !== null) {
      await cleanupTopic(topicId);
    }
  }
});

test('RSS poller skips creating an event when the agent rejects the item', {
  timeout: 180_000,
  skip: shouldSkip
}, async () => {
  const baselineGuid = 'baseline-gardening';
  const feed = buildFeed([
    {
      title: 'Community Gardening Tips',
      guid: 'gardening-article',
      description: 'Advice on seasonal plants and urban gardening best practices.',
      link: 'https://example.com/gardening-tips',
      pubDate: new Date().toUTCString()
    },
    {
      title: 'Old Gardening Item',
      guid: baselineGuid,
      description: 'Previous gardening update kept for GUID tracking.',
      link: 'https://example.com/gardening-baseline',
      pubDate: new Date(Date.now() - 86_400_000).toUTCString()
    }
  ]);

  const { server, url } = await startFeedServer(feed);

  let topicId: number | null = null;
  try {
    const topic = await prisma.topic.create({
      data: {
        title: 'TypeScript Updates',
        prompt: 'Notify me only about TypeScript compiler releases and official announcements.'
      }
    });
    topicId = topic.id;

    await prisma.topicConversationMessage.createMany({
      data: [
        {
          topicId: topic.id,
          role: 'user',
          content: 'Ignore anything that is not directly related to new TypeScript releases.'
        },
        {
          topicId: topic.id,
          role: 'assistant',
          content: 'Got it. I will filter out unrelated items such as gardening or lifestyle posts.'
        }
      ]
    });

    await prisma.source.create({
      data: {
        topicId: topic.id,
        sourceUrl: url,
        type: 'RSS',
        lastFetchedAt: new Date(Date.now() - 20 * 60 * 1000),
        lastItemGuid: baselineGuid
      }
    });

    const pollResult = await pollRSSSources();

    assert.equal(pollResult.failed, 0, 'poller should successfully process the source even when agent rejects');
    assert.equal(pollResult.newEvents, 0, 'agent rejection should yield no new events');

    const events = await prisma.event.findMany({ where: { topicId: topic.id } });
    assert.equal(events.length, 0, 'no events should be created for rejected content');
  } finally {
    server.close();
    if (topicId !== null) {
      await cleanupTopic(topicId);
    }
  }
});

test('Skip poll RSS agent tests when OPENAI_API_KEY is not set', { skip: !!process.env.OPENAI_API_KEY }, () => {
  assert.ok(!process.env.OPENAI_API_KEY, 'This placeholder keeps the test runner aware of the skipped suite');
});
