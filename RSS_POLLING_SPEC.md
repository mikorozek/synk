# RSS Polling Feature Specification

## Overview
Implement automated RSS feed polling to fetch new items from RSS sources and create corresponding Events in the database. The system will poll RSS sources every 15 minutes via an external cron job.

---

## Requirements

### 1. Database Schema Changes

**Source Model Updates**:
Add the following fields to track RSS polling state:

```prisma
model Source {
  id                   Int       @id @default(autoincrement())
  topicId              Int       @map("topic_id")
  sourceUrl            String    @map("source_url") @db.VarChar(1000)
  type                 String    @db.VarChar(100) // RSS, Twitter, Newsletter, etc.

  // RSS polling fields
  lastFetchedAt        DateTime? @map("last_fetched_at")
  lastItemGuid         String?   @map("last_item_guid") @db.VarChar(500)

  topic Topic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@index([topicId])
  @@index([type])
  @@index([type, lastFetchedAt]) // For efficient polling queries
  @@map("sources")
}
```

**New Fields**:
- `lastFetchedAt`: Timestamp of last successful poll (null if never polled)
- `lastItemGuid`: GUID of the most recent RSS item processed (used to detect new items)

**Index**: Composite index on `[type, lastFetchedAt]` for efficient polling queries

---

### 2. RSS Polling Endpoint

**Endpoint**: `POST /api/poll-rss`

**Purpose**: Called by external cron job every 1 minute to poll RSS sources

**Authentication**: TBD (recommend API key or internal-only access)

**Execution Flow**:
1. Query database for RSS sources that need polling
2. For each source, fetch and parse the RSS feed
3. Process new items and create Events
4. Update source polling metadata
5. Return summary of polling results

---

### 3. Polling Logic

**Source Selection Query**:
```typescript
const sourcesToPoll = await prisma.source.findMany({
  where: {
    type: 'RSS',
    OR: [
      { lastFetchedAt: null }, // Never fetched
      {
        lastFetchedAt: {
          lt: new Date(Date.now() - 15 * 60 * 1000) // > 15 minutes ago
        }
      }
    ]
  },
  include: {
    topic: true // Include topic for context
  }
});
```

**RSS Feed Processing**:
1. Fetch RSS feed from `sourceUrl`
2. Parse RSS/Atom feed using `rss-parser` library
3. Iterate through feed items in reverse chronological order
4. Stop when encountering item with GUID matching `lastItemGuid`
5. For new items (not yet processed):
   - Create Event in database
   - Link to source's topic
6. Update source metadata:
   - `lastFetchedAt` = current timestamp
   - `lastItemGuid` = GUID of newest item in feed

**RSS Item to Event Mapping**:
- RSS `item.title` → Event `title`
- RSS `item.description` → Event `summary`
- RSS `item.link` → Event `eventUrl`
- RSS `item.guid` → Used for tracking only (not stored in Event)
- Event `topicId` → Source's `topicId`
- Event `createdAt` → Auto-generated (current timestamp)

---

### 4. Error Handling

**Strategy**: Simple error logging without auto-disable

**Fetch Errors**:
- Network failures
- Invalid RSS feed format
- Timeout errors

**Handling**:
- Log error with source ID and URL
- Continue to next source (don't fail entire polling job)
- Do NOT update `lastFetchedAt` on error (will retry on next poll)
- Return error summary in endpoint response

**No Auto-Disable**: Sources remain active even after failures

---

### 5. Dependencies

**New Package Required**:
```bash
npm install rss-parser
```

**Library**: `rss-parser`
- Popular, simple RSS/Atom feed parser
- Handles most RSS formats automatically
- Provides typed interfaces for feed items

---

### 6. API Response

**Response Body**:
```json
{
  "polled": 15,           // Number of sources polled
  "successful": 13,       // Number of successful polls
  "failed": 2,            // Number of failed polls
  "newEvents": 47,        // Total new events created
  "errors": [
    {
      "sourceId": 123,
      "sourceUrl": "https://broken-feed.com/rss",
      "error": "Network timeout"
    }
  ],
  "duration": 2.5        // Polling duration in seconds
}
```

---

### 7. Configuration

**Polling Interval**: Fixed 15 minutes for all RSS sources

**Cron Schedule**: External cron job runs every 1 minute
- Endpoint checks if 15 minutes have elapsed since last poll
- Sources polled immediately on first run (`lastFetchedAt = null`)

**Timeout**: TBD (recommend 30-60 seconds for entire polling job)

---

### 8. Implementation Files

**Files to Create**:
- `/app/api/poll-rss/route.ts` - Polling endpoint
- `/lib/rss-poller.ts` - RSS fetching and parsing logic

**Files to Modify**:
- `/prisma/schema.prisma` - Add RSS polling fields to Source model

**Migration Required**: Yes, for schema changes

---

### 9. Example Usage

**Cron Job Configuration** (example using cron):
```cron
* * * * * curl -X POST https://your-app.com/api/poll-rss
```

**Manual Trigger** (for testing):
```bash
curl -X POST http://localhost:3000/api/poll-rss
```

**Expected Behavior**:
- First call: Polls all RSS sources (all have `lastFetchedAt = null`)
- Subsequent calls: Only polls sources where `lastFetchedAt < now - 15 minutes`
- Creates Events for new RSS items since last poll
- Updates `lastFetchedAt` and `lastItemGuid` for each source

---

### 10. Duplicate Prevention

**Strategy**: Use RSS item GUID for tracking

**How It Works**:
1. Each RSS item has a unique GUID (globally unique identifier)
2. Store GUID of most recent processed item in `lastItemGuid`
3. When polling, iterate through items until hitting known GUID
4. Only process items newer than `lastItemGuid`

**Edge Cases**:
- Feed has no GUIDs: Use `item.link` as fallback identifier
- GUID changes: May create duplicate events (acceptable trade-off)
- Feed removes old items: Still works (only processes new items)

---

### 11. Success Criteria

- ✅ RSS sources polled every 15 minutes
- ✅ New RSS items create Events in database
- ✅ No duplicate Events created for same RSS item
- ✅ Failed polls logged but don't break entire job
- ✅ Efficient database queries (indexed)
- ✅ Clear response showing polling results
- ✅ `lastFetchedAt` and `lastItemGuid` updated after each poll

---

## Future Enhancements (Not in Initial Implementation)

- **Per-source intervals**: Add `fetchIntervalMinutes` field
- **Auto-disable on failures**: Add `isActive` and `fetchErrorCount` fields
- **Error details storage**: Add `lastError` field
- **Rate limiting**: Throttle requests to same domain
- **Parallel processing**: Poll multiple feeds concurrently
- **Webhook support**: Allow real-time RSS updates via webhooks

---

## Notes

- **Simple implementation**: Focus on core functionality first
- **No retries**: Single attempt per source per poll
- **No transactions**: Each source processed independently
- **No batching**: Process items one at a time
- **Monitoring**: Log all polling activity for debugging
