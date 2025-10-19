/**
 * Setup script to add test RSS sources to the database
 * Run with: npx tsx setup-test-rss-sources.ts
 */

import { prisma } from './lib/db';

async function setupTestSources() {
  console.log('🔧 Setting up test RSS sources...\n');

  try {
    // Create a test topic first
    const testTopic = await prisma.topic.upsert({
      where: { id: 999 },
      update: {},
      create: {
        id: 999,
        title: 'Test Topic - Tech News',
        prompt: 'Track technology and programming news'
      }
    });

    console.log(`✅ Created/found topic: "${testTopic.title}" (ID: ${testTopic.id})\n`);

    // Test RSS sources (high-frequency feeds)
    const testSources = [
      {
        sourceUrl: 'https://news.ycombinator.com/rss',
        name: 'Hacker News',
        updateFreq: '~5-15 min'
      },
      {
        sourceUrl: 'https://www.reddit.com/r/programming/.rss',
        name: 'Reddit r/programming',
        updateFreq: '~1-5 min'
      },
      {
        sourceUrl: 'https://techcrunch.com/feed/',
        name: 'TechCrunch',
        updateFreq: '~30-60 min'
      }
    ];

    console.log('📰 Adding RSS sources:\n');

    for (const source of testSources) {
      // Check if source already exists
      const existing = await prisma.source.findFirst({
        where: {
          sourceUrl: source.sourceUrl,
          topicId: testTopic.id
        }
      });

      if (existing) {
        console.log(`⏭️  Skipped (exists): ${source.name}`);
        console.log(`   URL: ${source.sourceUrl}`);
        console.log(`   ID: ${existing.id}\n`);
      } else {
        const created = await prisma.source.create({
          data: {
            topicId: testTopic.id,
            sourceUrl: source.sourceUrl,
            type: 'RSS'
          }
        });

        console.log(`✅ Added: ${source.name}`);
        console.log(`   URL: ${source.sourceUrl}`);
        console.log(`   Update freq: ${source.updateFreq}`);
        console.log(`   ID: ${created.id}\n`);
      }
    }

    // Show current state
    const allSources = await prisma.source.findMany({
      where: { type: 'RSS' },
      include: { topic: true }
    });

    console.log('\n📊 Current RSS Sources in Database:');
    console.log('===================================\n');

    for (const source of allSources) {
      console.log(`ID ${source.id}: ${source.sourceUrl}`);
      console.log(`  Topic: ${source.topic.title}`);
      console.log(`  Last Fetched: ${source.lastFetchedAt || 'Never'}`);
      console.log(`  Last GUID: ${source.lastItemGuid || 'None'}\n`);
    }

    console.log('✅ Setup complete!\n');
    console.log('💡 Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Test polling: ./test-rss-polling.sh');
    console.log('  3. View events in Prisma Studio');

  } catch (error) {
    console.error('❌ Error setting up test sources:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTestSources();
