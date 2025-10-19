#!/bin/bash

# Quick RSS Polling Test
# Usage: ./quick-test-rss.sh [setup|poll|reset|status]

set -e

ENDPOINT="http://localhost:3000/api/poll-rss"

case "$1" in
  setup)
    echo "🔧 Setting up test RSS sources..."
    npx tsx setup-test-rss-sources.ts
    ;;

  poll)
    echo "📡 Polling RSS feeds..."
    echo ""
    curl -s -X POST "$ENDPOINT" | jq '.'
    ;;

  reset)
    echo "🔄 Resetting polling metadata..."
    npx tsx -e "
      import { prisma } from './lib/db';
      const result = await prisma.source.updateMany({
        where: { type: 'RSS' },
        data: { lastFetchedAt: null, lastItemGuid: null }
      });
      console.log('✅ Reset', result.count, 'RSS sources');
      await prisma.\$disconnect();
    "
    ;;

  status)
    echo "📊 RSS Sources Status:"
    echo ""
    npx tsx -e "
      import { prisma } from './lib/db';
      const sources = await prisma.source.findMany({
        where: { type: 'RSS' },
        include: { topic: true },
        orderBy: { id: 'asc' }
      });

      if (sources.length === 0) {
        console.log('❌ No RSS sources found. Run: ./quick-test-rss.sh setup');
      } else {
        console.log('Total RSS sources:', sources.length, '\n');
        for (const s of sources) {
          console.log('ID', s.id + ':', s.sourceUrl);
          console.log('  Topic:', s.topic.title);
          console.log('  Last fetched:', s.lastFetchedAt || 'Never');
          console.log('  Last GUID:', s.lastItemGuid ? s.lastItemGuid.substring(0, 50) + '...' : 'None');
          console.log('');
        }
      }

      const eventCount = await prisma.event.count({
        where: { topic: { sources: { some: { type: 'RSS' } } } }
      });
      console.log('📰 Total events from RSS sources:', eventCount);

      await prisma.\$disconnect();
    "
    ;;

  *)
    echo "🧪 Quick RSS Testing Tool"
    echo ""
    echo "Usage: ./quick-test-rss.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup   - Add test RSS sources to database"
    echo "  poll    - Trigger RSS polling manually"
    echo "  reset   - Reset polling metadata (forces re-poll)"
    echo "  status  - Show current RSS sources and stats"
    echo ""
    echo "Examples:"
    echo "  ./quick-test-rss.sh setup    # First time setup"
    echo "  ./quick-test-rss.sh poll     # Test polling"
    echo "  ./quick-test-rss.sh status   # Check current state"
    echo "  ./quick-test-rss.sh reset    # Force re-poll all sources"
    ;;
esac
