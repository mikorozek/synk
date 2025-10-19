# RSS Polling Improvements

## Changes Implemented

### 1. ✅ Added Publication Date to Events

Events now capture the original publication date from RSS feeds.

**Database Schema:**
```prisma
model Event {
  id          Int       @id @default(autoincrement())
  eventUrl    String?   @map("event_url")
  topicId     Int       @map("topic_id")
  summary     String?
  title       String
  createdAt   DateTime  @default(now()) @map("created_at")
  publishedAt DateTime? @map("published_at")  // ✨ NEW
  unread      Boolean   @default(true)

  @@index([publishedAt(sort: Desc)])  // ✨ NEW INDEX
}
```

**What it captures:**
- `publishedAt`: When the article/event was originally published (from RSS feed)
- `createdAt`: When we added the event to our database

**RSS field mapping:**
- Tries `item.pubDate` first (most common)
- Falls back to `item.isoDate` (Atom feeds)
- Falls back to `item.published` (alternative format)
- `null` if no date found

---

### 2. ✅ Skip Creating Events on First Poll

When an RSS source is polled for the first time, it now:
- ✅ Fetches the RSS feed
- ✅ Records the newest item's GUID
- ✅ Updates `lastFetchedAt`
- ❌ **Does NOT create events** (skips old items)

**Why?** Prevents flooding the database with old articles when adding a new RSS source.

**Behavior:**

| Poll Type | Has `lastItemGuid`? | Creates Events? | Updates Metadata? |
|-----------|---------------------|-----------------|-------------------|
| First Poll | ❌ No (`null`) | ❌ No (skips all) | ✅ Yes |
| Second+ Poll | ✅ Yes | ✅ Yes (only new items) | ✅ Yes |

---

## Migration Applied

**Migration File:** `add-published-at-migration.sql`

```sql
-- Add the published_at column (nullable)
ALTER TABLE "events"
  ADD COLUMN "published_at" TIMESTAMP(3);

-- Create index for efficient sorting by publication date
CREATE INDEX "events_published_at_idx" ON "events"("published_at" DESC);
```

**Applied to database:** ✅
**Prisma Client regenerated:** ✅
**App restarted:** ✅

---

## Code Changes

### lib/rss-poller.ts

**Added first poll detection:**
```typescript
// Check if this is the first poll (never polled before)
const isFirstPoll = !source.lastItemGuid;
```

**Added publication date extraction:**
```typescript
// Parse publication date from RSS item
const publishedAt = item.pubDate || item.isoDate || item.published;
const publishedDate = publishedAt ? new Date(publishedAt) : null;
```

**Skip event creation on first poll:**
```typescript
// Create events for new items (skip on first poll to avoid old items)
if (!isFirstPoll) {
  // Create events...
} else {
  console.log(`[RSS Poller] First poll for source ${source.id} - skipping ${newItems.length} existing items`);
}
```

**Updated event creation:**
```typescript
await prisma.event.create({
  data: {
    title: item.title || 'Untitled',
    summary: item.contentSnippet || item.content || item.description || null,
    eventUrl: item.link || null,
    topicId: source.topicId,
    publishedAt: publishedDate,  // ✨ NEW
    unread: true
  }
});
```

---

## Testing Results

### Test 1: First Poll Behavior ✅

**Setup:**
- Added new RSS source: `https://news.ycombinator.com/rss`
- Reset existing source to simulate first poll

**Expected:** No events created, metadata updated
**Result:** ✅ Success

```
[RSS Poller] First poll for source 21 - skipping 30 existing items
[RSS Poller] First poll for source 3 - skipping 20 existing items
```

**Polling response:**
```json
{
  "polled": 3,
  "successful": 3,
  "failed": 0,
  "newEvents": 0,  // ← No events created!
  "duration": 2.8
}
```

**Database verification:**
- Event count before: 32
- Event count after: 32 ✅ (unchanged)
- Sources updated with `last_item_guid`: ✅

---

### Test 2: Second Poll with New Items ✅

**Setup:**
- Simulated new items by changing `last_item_guid`
- Polled again

**Expected:** New events created with `publishedAt`
**Result:** ✅ Success

**Polling response:**
```json
{
  "polled": 2,
  "successful": 2,
  "failed": 0,
  "newEvents": 30,  // ← Events created!
  "duration": 2.2
}
```

**Database verification:**
```sql
SELECT id, title, published_at, created_at
FROM events
ORDER BY created_at DESC
LIMIT 3;
```

**Result:**
```
id | title                                          | published_at        | created_at
62 | Attention is a luxury good                     | 2025-10-18 15:39:47 | 2025-10-18 22:39:56
61 | Show HN: The Shape of YouTube                  | 2025-10-12 09:40:56 | 2025-10-18 22:39:56
60 | Fast calculation of distance to Bezier curves  | 2025-10-18 09:25:30 | 2025-10-18 22:39:56
```

✅ `published_at` populated from RSS feed
✅ `created_at` shows when we added it to database

---

### Test 3: Events Statistics ✅

```sql
SELECT
  COUNT(*) as total_events,
  COUNT(published_at) as events_with_published_date,
  COUNT(*) - COUNT(published_at) as events_without_published_date
FROM events;
```

**Result:**
```
total_events | events_with_published_date | events_without_published_date
62           | 30                         | 32
```

✅ Old events (created before migration): `published_at = null`
✅ New events (created after migration): `published_at` populated

---

## Usage Examples

### Query Events by Publication Date

```typescript
// Get events published in the last 24 hours
const recentEvents = await prisma.event.findMany({
  where: {
    publishedAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  },
  orderBy: { publishedAt: 'desc' }
});
```

### Sort Events by Publication Date

```typescript
// Show events in order of when they were published (not when we found them)
const events = await prisma.event.findMany({
  orderBy: { publishedAt: 'desc' }
});
```

### Filter Events by Date Range

```typescript
// Get events published this week
const thisWeekEvents = await prisma.event.findMany({
  where: {
    publishedAt: {
      gte: startOfWeek(new Date()),
      lte: endOfWeek(new Date())
    }
  }
});
```

---

## API Response Examples

### Polling a New RSS Source (First Time)

**Request:**
```bash
curl -X POST http://localhost:3000/api/poll-rss
```

**Response:**
```json
{
  "polled": 1,
  "successful": 1,
  "failed": 0,
  "newEvents": 0,
  "errors": [],
  "duration": 1.2
}
```

**Logs:**
```
[RSS Poller] First poll for source 21 - skipping 30 existing items
```

---

### Polling After First Time (New Items Available)

**Request:**
```bash
curl -X POST http://localhost:3000/api/poll-rss
```

**Response:**
```json
{
  "polled": 1,
  "successful": 1,
  "failed": 0,
  "newEvents": 5,
  "errors": [],
  "duration": 1.8
}
```

**Created Events:**
```json
[
  {
    "id": 63,
    "title": "New Article",
    "publishedAt": "2025-10-18T15:30:00.000Z",
    "createdAt": "2025-10-18T22:40:00.000Z",
    "unread": true
  }
]
```

---

## Database Schema Summary

### Events Table (Updated)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `event_url` | VARCHAR(1000) | Link to the event |
| `topic_id` | INT | Foreign key to topics |
| `summary` | TEXT | Event description |
| `title` | VARCHAR(500) | Event title |
| `created_at` | TIMESTAMP | When we added to DB ✅ |
| `published_at` | TIMESTAMP | When originally published ✨ NEW |
| `unread` | BOOLEAN | Read/unread status |

### Indexes

- `events_topic_id_idx` - Filter by topic
- `events_created_at_idx` - Sort by when we found it
- `events_published_at_idx` - Sort by when it was published ✨ NEW
- `events_unread_idx` - Filter by read status

---

## Real-World Example

**Scenario:** You add TechCrunch RSS feed to your topics.

**First Poll (at 10:00 AM):**
- Fetches RSS feed with 20 articles
- Records newest article GUID
- **Does NOT create 20 events** (avoids old news)
- Updates `lastFetchedAt` and `lastItemGuid`

**Second Poll (at 10:15 AM):**
- Fetches RSS feed again
- Finds 2 new articles since last poll
- **Creates 2 new events** with:
  - `publishedAt`: When TechCrunch published them (e.g., 9:45 AM)
  - `createdAt`: When we found them (10:15 AM)
  - `unread`: true

**Third Poll (at 10:30 AM):**
- No new articles
- Returns immediately with `newEvents: 0`

---

## Benefits

### 1. Accurate Event Timeline
- See when articles were actually published
- Sort by publication date vs. discovery date
- Better for news/time-sensitive content

### 2. Cleaner Database on Startup
- Adding a new RSS source doesn't flood database with old articles
- First poll just establishes baseline
- Only new content creates events

### 3. Better User Experience
- Users see only new content
- No "100 unread articles" on first setup
- Publication dates help prioritize reading

---

## Migration Checklist

When updating an existing system:

- [x] Update Prisma schema
- [x] Create migration SQL file
- [x] Apply migration to database
- [x] Regenerate Prisma Client
- [x] Restart application
- [x] Test first poll behavior
- [x] Test subsequent polls
- [x] Verify publication dates

---

## Troubleshooting

### Events Missing Publication Date

**Cause:** Some RSS feeds don't include publication dates

**Solution:** `publishedAt` will be `null` - this is expected

**Query to find them:**
```sql
SELECT COUNT(*) FROM events WHERE published_at IS NULL;
```

### First Poll Not Skipping Events

**Check:**
1. Source has `last_item_guid = NULL`
2. Logs show "First poll for source X - skipping N items"
3. Event count doesn't increase

**Debug:**
```bash
docker logs synk-app-1 | grep "First poll"
```

### Publication Dates in Future

**Cause:** RSS feed has incorrect dates or timezone issues

**Solution:** This is data from the feed - consider validating:
```typescript
const publishedDate = publishedAt
  ? new Date(publishedAt)
  : null;

// Validate date isn't in future
if (publishedDate && publishedDate > new Date()) {
  console.warn(`Future date detected: ${publishedDate}`);
}
```

---

## Summary

✅ **Publication dates** added to all new events
✅ **First poll** skips creating events (prevents old items)
✅ **Subsequent polls** only create events for new items
✅ **Backward compatible** - old events have `publishedAt = null`
✅ **Tested and verified** - all behaviors working correctly

**Next time you add an RSS source, it will:**
1. Poll the feed
2. Save the baseline (newest item GUID)
3. NOT create any events
4. Only create events for items published AFTER that baseline
