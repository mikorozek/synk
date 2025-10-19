# RSS Polling Testing Guide

## Quick Start Testing

### 1. Setup Test RSS Sources

```bash
# Install tsx if not already installed
npm install -D tsx

# Run the setup script to add test RSS feeds
npx tsx setup-test-rss-sources.ts
```

This creates:
- A test topic (ID: 999) for "Tech News"
- 3 high-frequency RSS sources:
  - Hacker News (~5-15 min updates)
  - Reddit r/programming (~1-5 min updates)
  - TechCrunch (~30-60 min updates)

### 2. Start Your Dev Server

```bash
npm run dev
```

### 3. Test the Polling Endpoint

**Option A: Using the test script**
```bash
./test-rss-polling.sh
```

**Option B: Manual curl**
```bash
curl -X POST http://localhost:3000/api/poll-rss
```

**Option C: Using httpie (prettier output)**
```bash
http POST http://localhost:3000/api/poll-rss
```

---

## Expected Behavior

### First Poll (Initial Run)
```json
{
  "polled": 3,
  "successful": 3,
  "failed": 0,
  "newEvents": 45,
  "errors": [],
  "duration": 2.3
}
```
- All RSS sources polled (lastFetchedAt was null)
- Creates events for recent items in each feed
- Updates lastFetchedAt and lastItemGuid

### Second Poll (< 15 minutes later)
```json
{
  "polled": 0,
  "successful": 0,
  "failed": 0,
  "newEvents": 0,
  "errors": [],
  "duration": 0.05
}
```
- No sources polled (< 15 minutes elapsed)
- Very fast response (just database query)

### Third Poll (> 15 minutes later)
```json
{
  "polled": 3,
  "successful": 3,
  "failed": 0,
  "newEvents": 8,
  "errors": [],
  "duration": 1.8
}
```
- All sources polled again
- Only creates events for NEW items since last poll
- No duplicates created

---

## Test RSS Feeds

### High Frequency (Best for Testing)

| Feed | URL | Frequency |
|------|-----|-----------|
| Hacker News | `https://news.ycombinator.com/rss` | ~5-15 min |
| Reddit r/programming | `https://www.reddit.com/r/programming/.rss` | ~1-5 min |
| Reddit r/worldnews | `https://www.reddit.com/r/worldnews/.rss` | ~1-5 min |
| TechCrunch | `https://techcrunch.com/feed/` | ~30-60 min |

### Medium Frequency

| Feed | URL | Frequency |
|------|-----|-----------|
| BBC News | `https://feeds.bbci.co.uk/news/rss.xml` | ~15-30 min |
| The Verge | `https://www.theverge.com/rss/index.xml` | ~30-60 min |
| Ars Technica | `https://feeds.arstechnica.com/arstechnica/index` | ~1-2 hours |

### Low Frequency (Daily)

| Feed | URL | Frequency |
|------|-----|-----------|
| GitHub Trending | `https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml` | Daily |
| XKCD | `https://xkcd.com/rss.xml` | 2-3x/week |

---

## Verification Steps

### 1. Check Prisma Studio
If Prisma Studio is running, go to:
- **Sources table**: Verify `lastFetchedAt` and `lastItemGuid` are updated
- **Events table**: See newly created events

### 2. Check Database Directly
```bash
# View sources with polling metadata
npx prisma studio
# or use psql/SQL client
```

### 3. Monitor Logs
The endpoint logs polling activity:
```
RSS Polling completed: {
  polled: 3,
  successful: 3,
  failed: 0,
  newEvents: 12,
  duration: "2.34s"
}
```

---

## Testing Scenarios

### Scenario 1: First Time Polling
**Test:** Poll a brand new RSS source (lastFetchedAt = null)

**Expected:**
- Source gets polled immediately
- Creates events for recent feed items
- Updates lastFetchedAt and lastItemGuid

**Verify:**
```sql
SELECT id, source_url, last_fetched_at, last_item_guid
FROM sources
WHERE type = 'RSS';
```

### Scenario 2: Duplicate Prevention
**Test:** Poll the same source twice within 20 minutes

**Expected:**
- First poll: Creates events for all feed items
- Second poll (< 15 min): Source NOT polled
- Third poll (> 15 min): Only creates NEW events

**Verify:**
```sql
SELECT title, event_url, created_at
FROM events
ORDER BY created_at DESC
LIMIT 20;
```
- No duplicate titles/URLs

### Scenario 3: Error Handling
**Test:** Add a broken RSS feed URL

**Setup:**
```typescript
await prisma.source.create({
  data: {
    topicId: 999,
    sourceUrl: 'https://invalid-feed-url.com/rss',
    type: 'RSS'
  }
});
```

**Expected Response:**
```json
{
  "polled": 4,
  "successful": 3,
  "failed": 1,
  "newEvents": 12,
  "errors": [
    {
      "sourceId": 123,
      "sourceUrl": "https://invalid-feed-url.com/rss",
      "error": "Network timeout"
    }
  ],
  "duration": 3.5
}
```

**Verify:**
- Failed source's `lastFetchedAt` NOT updated
- Other sources processed successfully
- Error logged but didn't break entire job

### Scenario 4: Empty Feed
**Test:** Poll an RSS feed with no items

**Expected:**
- Source polled successfully
- No events created (newEvents: 0)
- lastFetchedAt updated
- lastItemGuid unchanged

---

## Simulating Cron Job

### Local Testing with Watch
```bash
# Poll every 60 seconds (for testing)
watch -n 60 'curl -X POST http://localhost:3000/api/poll-rss'
```

### Actual Cron Setup (Production)
```bash
# Edit crontab
crontab -e

# Add this line (polls every minute)
* * * * * curl -X POST https://your-domain.com/api/poll-rss

# Or every 15 minutes
*/15 * * * * curl -X POST https://your-domain.com/api/poll-rss
```

### Using systemd Timer (Linux)
```bash
# Create timer file: /etc/systemd/system/rss-poll.timer
[Unit]
Description=RSS Polling Timer

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min

[Install]
WantedBy=timers.target

# Enable and start
sudo systemctl enable rss-poll.timer
sudo systemctl start rss-poll.timer
```

---

## Performance Testing

### Test with Many Sources
```bash
# Add 50 test RSS sources
npx tsx -e "
import { prisma } from './lib/db';
const feeds = [
  'https://news.ycombinator.com/rss',
  'https://techcrunch.com/feed/',
  // ... add 50 feeds
];
// Create sources in loop
"
```

**Monitor:**
- Response time (should be < 30 seconds for 50 sources)
- Memory usage
- Database query performance

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Create test config: artillery.yml
artillery quick --count 10 --num 5 http://localhost:3000/api/poll-rss
```

---

## Troubleshooting

### No Events Created
**Check:**
1. Feed URL is valid: `curl https://news.ycombinator.com/rss`
2. Source type is 'RSS' (case-sensitive)
3. Topic exists and ID is correct
4. Database connection working

### Duplicate Events
**Check:**
1. `lastItemGuid` is being saved correctly
2. RSS items have stable GUIDs
3. Multiple polling jobs aren't running simultaneously

### Sources Not Polling
**Check:**
1. `lastFetchedAt` timestamp (must be > 15 min old)
2. Source type filter (must be 'RSS')
3. Database indexes exist (check with `\d sources` in psql)

---

## Cleanup

### Remove Test Data
```bash
npx tsx -e "
import { prisma } from './lib/db';
await prisma.event.deleteMany({ where: { topicId: 999 } });
await prisma.source.deleteMany({ where: { topicId: 999 } });
await prisma.topic.delete({ where: { id: 999 } });
console.log('✅ Test data removed');
"
```

### Reset Polling Metadata
```sql
UPDATE sources
SET last_fetched_at = NULL, last_item_guid = NULL
WHERE type = 'RSS';
```

---

## Production Checklist

Before deploying:
- [ ] Database migration applied (`npx prisma migrate deploy`)
- [ ] Indexes created (check schema)
- [ ] Cron job configured
- [ ] Monitoring/logging setup
- [ ] Error alerting configured
- [ ] Test with production RSS feeds
- [ ] Verify 15-minute polling interval
- [ ] Check API authentication (if needed)

---

## API Endpoint Reference

**Endpoint:** `POST /api/poll-rss`

**Headers:** None required (add authentication in production)

**Response:**
```typescript
{
  polled: number;        // Sources checked
  successful: number;    // Successful polls
  failed: number;        // Failed polls
  newEvents: number;     // Events created
  errors: Array<{
    sourceId: number;
    sourceUrl: string;
    error: string;
  }>;
  duration: number;      // Seconds
}
```

**Status Codes:**
- `200`: Success (even if some sources failed)
- `500`: Complete failure (endpoint error)
