import assert from 'node:assert/strict';
import { test } from 'node:test';

import { prisma } from '../lib/db';
import { pollStaticSites } from '../lib/static-site-poller';

const originalFetch = globalThis.fetch;

interface FirecrawlMockResponse {
  markdown: string;
}

interface OpenAIMockResponse {
  approved: boolean;
  title?: string;
  summary?: string;
}

function installFetchMock(firecrawlResponses: FirecrawlMockResponse[], openaiResponse: OpenAIMockResponse) {
  let firecrawlCallIndex = 0;
  globalThis.fetch = async (url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

    // Handle OpenAI API calls
    if (urlString.includes('api.openai.com')) {
      const responseData = {
        id: 'mock-response-id',
        created_at: Math.floor(Date.now() / 1000),
        model: 'gpt-5',
        output: [{
          id: 'mock-output-id',
          type: 'message',
          role: 'assistant',
          content: [{
            type: 'output_text',
            text: JSON.stringify({
              matchesUserPrompt: openaiResponse.approved,
              notificationName: openaiResponse.approved ? openaiResponse.title : null,
              notificationDescription: openaiResponse.approved ? openaiResponse.summary : null
            }),
            annotations: []
          }]
        }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      };
      const responseText = JSON.stringify(responseData);

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/json'
        }),
        text: async () => responseText,
        json: async () => responseData
      } as Response;
    }

    // Handle Firecrawl API calls
    const response = firecrawlResponses[firecrawlCallIndex];
    firecrawlCallIndex++;
    if (!response) {
      throw new Error('Unexpected Firecrawl fetch call');
    }

    const firecrawlData = {
      success: true,
      data: {
        markdown: response.markdown
      }
    };
    const firecrawlText = JSON.stringify(firecrawlData);

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'application/json'
      }),
      text: async () => firecrawlText,
      json: async () => firecrawlData
    } as Response;
  };
}

async function cleanupTopic(topicId: number): Promise<void> {
  await prisma.event.deleteMany({ where: { topicId } });
  await prisma.source.deleteMany({ where: { topicId } });
  await prisma.topicConversationMessage.deleteMany({ where: { topicId } });
  await prisma.topic.delete({ where: { id: topicId } }).catch(() => undefined);
}

const hasRequiredEnv = !!process.env.OPENAI_API_KEY;

test('Static site poller creates an event when agent approves the change', {
  timeout: 180_000,
  skip: !hasRequiredEnv
}, async () => {
  const previousFirecrawlKey = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = previousFirecrawlKey || 'test-firecrawl-key';

  installFetchMock([
    {
      markdown: `# TypeScript 6.0 Release Notes\n\n- Major improvements to the compiler\n- New features for developers`
    }
  ], {
    approved: true,
    title: 'TypeScript 6.0 Released',
    summary: 'Major new release with compiler improvements'
  });

  let topicId: number | null = null;

  try {
    const topic = await prisma.topic.create({
      data: {
        title: 'TypeScript Updates',
        prompt: 'Notify me about official TypeScript releases and important compiler news.'
      }
    });
    topicId = topic.id;

    await prisma.topicConversationMessage.createMany({
      data: [
        {
          topicId: topic.id,
          role: 'user',
          content: 'I am only interested in major TypeScript release notes and compiler updates.'
        },
        {
          topicId: topic.id,
          role: 'assistant',
          content: 'Understood. I will highlight only significant TypeScript release information.'
        }
      ]
    });

    const initialContent = '# Previous content\n\nNo major updates yet.';

    await prisma.source.create({
      data: {
        topicId: topic.id,
        sourceUrl: 'https://example.com/typescript',
        type: 'Website',
        lastFetchedAt: new Date(Date.now() - 20 * 60 * 1000),
        lastContent: initialContent
      }
    });

    const result = await pollStaticSites();

    assert.equal(result.failed, 0, 'agent-approved change should not fail the poll');
    assert.ok(result.eventsCreated >= 1, 'poller should report at least one created event');

    const events = await prisma.event.findMany({
      where: { topicId: topic.id },
      orderBy: { createdAt: 'desc' }
    });

    assert.ok(events.length > 0, 'agent-approved change should create an event');
    const event = events[0];
    assert.ok(event.title.trim().length > 0, 'event should have a title from the agent');
    assert.equal(event.eventUrl, 'https://example.com/typescript', 'event should link to the source');
    assert.ok(event.contentDiff && event.contentDiff.length > 0, 'diff should be stored');
    assert.ok(event.contentDiff.includes('TypeSc') || event.contentDiff.includes('Release Notes'), 'diff should capture new content');
  } finally {
    globalThis.fetch = originalFetch;
    if (topicId !== null) {
      await cleanupTopic(topicId);
    }
    process.env.FIRECRAWL_API_KEY = previousFirecrawlKey;
  }
});

test('Static site poller skips event when agent rejects the change', {
  timeout: 180_000,
  skip: !hasRequiredEnv
}, async () => {
  const previousFirecrawlKey = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = previousFirecrawlKey || 'test-firecrawl-key';

  installFetchMock([
    {
      markdown: `# Community Gardening Tips\n\n- Best soil for tomatoes\n- Watering schedule recommendations`
    }
  ], {
    approved: false,
    title: '',
    summary: ''
  });

  let topicId: number | null = null;

  try {
    const topic = await prisma.topic.create({
      data: {
        title: 'TypeScript Updates',
        prompt: 'Alert me about TypeScript releases and language evolution.'
      }
    });
    topicId = topic.id;

    await prisma.topicConversationMessage.createMany({
      data: [
        {
          topicId: topic.id,
          role: 'user',
          content: 'Do not include unrelated lifestyle or gardening content.'
        },
        {
          topicId: topic.id,
          role: 'assistant',
          content: 'I will filter out anything unrelated to TypeScript releases.'
        }
      ]
    });

    const initialContent = '# TypeScript Blog\n\nComing soon: TypeScript roadmap updates.';

    await prisma.source.create({
      data: {
        topicId: topic.id,
        sourceUrl: 'https://example.com/typescript',
        type: 'Website',
        lastFetchedAt: new Date(Date.now() - 20 * 60 * 1000),
        lastContent: initialContent
      }
    });

    const result = await pollStaticSites();

    assert.equal(result.failed, 0, 'agent rejection should not mark the poll as failed');
    assert.equal(result.eventsCreated, 0, 'no events should be created for rejected change');

    const events = await prisma.event.findMany({ where: { topicId: topic.id } });
    assert.equal(events.length, 0, 'database should remain unchanged when agent rejects');
  } finally {
    globalThis.fetch = originalFetch;
    if (topicId !== null) {
      await cleanupTopic(topicId);
    }
    process.env.FIRECRAWL_API_KEY = previousFirecrawlKey;
  }
});

test('Skip static site agent tests when OPENAI_API_KEY is not set', { skip: hasRequiredEnv }, () => {
  assert.ok(!hasRequiredEnv, 'placeholder ensures skip is counted');
});
