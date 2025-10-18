const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const topic = await prisma.topic.create({
    data: {
      title: 'Example Topic',
      events: {
        create: [{ title: 'First Event', url: 'https://example.com/1', summary: 'summary 1' }]
      },
      sources: {
        create: [{ url: 'https://source.example.com', type: 'web' }]
      }
    },
    include: { events: true, sources: true }
  });

  console.log('Created topic:', JSON.stringify(topic, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
