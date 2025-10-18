import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample topics
  const aiTopic = await prisma.topic.create({
    data: {
      title: 'AI Developments',
      prompt: 'Track the latest developments in artificial intelligence, machine learning, and AI applications',
    },
  })

  const techTopic = await prisma.topic.create({
    data: {
      title: 'Tech News',
      prompt: 'Monitor technology industry news, startup announcements, and product launches',
    },
  })

  // Create sample sources
  await prisma.source.createMany({
    data: [
      {
        topicId: aiTopic.id,
        sourceUrl: 'https://feeds.feedburner.com/oreilly/radar',
        type: 'RSS',
      },
      {
        topicId: aiTopic.id,
        sourceUrl: 'https://twitter.com/OpenAI',
        type: 'Twitter',
      },
      {
        topicId: techTopic.id,
        sourceUrl: 'https://techcrunch.com/feed/',
        type: 'RSS',
      },
    ],
  })

  // Create sample events
  await prisma.event.createMany({
    data: [
      {
        topicId: aiTopic.id,
        title: 'New AI Model Released by OpenAI',
        summary: 'OpenAI has announced a new language model with improved reasoning capabilities and reduced hallucinations.',
        eventUrl: 'https://example.com/openai-news',
      },
      {
        topicId: aiTopic.id,
        title: 'Google Announces AI-Powered Search Features',
        summary: 'Google is rolling out new AI-powered search features that provide more contextual and conversational results.',
        eventUrl: 'https://example.com/google-ai-search',
      },
      {
        topicId: techTopic.id,
        title: 'Major Tech Company IPO Announced',
        summary: 'A leading technology startup has filed for an initial public offering, valued at $10 billion.',
        eventUrl: 'https://example.com/tech-ipo',
      },
    ],
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })