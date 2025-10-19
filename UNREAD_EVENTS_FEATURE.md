# Unread Events Feature

## Overview
Added `unread` boolean field to track which events have been read by the user. All new events are marked as `unread: true` by default.

---

## Database Changes

### Event Model Updates
```prisma
model Event {
  id        Int      @id @default(autoincrement())
  eventUrl  String?  @map("event_url") @db.VarChar(1000)
  topicId   Int      @map("topic_id")
  summary   String?
  title     String   @db.VarChar(500)
  createdAt DateTime @default(now()) @map("created_at")
  unread    Boolean  @default(true)  // ✨ NEW FIELD

  topic Topic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@index([topicId])
  @@index([createdAt(sort: Desc)])
  @@index([unread])  // ✨ NEW INDEX
  @@map("events")
}
```

**New Fields:**
- `unread`: Boolean (default: `true`)
  - `true` = Event not yet read by user
  - `false` = Event has been read

**New Index:**
- `@@index([unread])` - For efficient filtering of unread events

---

## Migration

### Apply Migration

**Option 1: Using the migration script (Recommended)**
```bash
./apply-unread-migration.sh
```

**Option 2: Manual SQL**
```bash
psql $DATABASE_URL -f add_unread_migration.sql
npx prisma generate
```

**Option 3: Prisma Migrate (if you have interactive terminal)**
```bash
npx prisma migrate dev --name add_unread_field_to_events
```

### Migration SQL
```sql
-- Add the unread column with default value of true
ALTER TABLE "events" ADD COLUMN "unread" BOOLEAN NOT NULL DEFAULT true;

-- Create index on unread column for efficient filtering
CREATE INDEX "events_unread_idx" ON "events"("unread");
```

**Note:** All existing events will be marked as `unread: true` by default. To mark them as read:
```sql
UPDATE "events" SET "unread" = false WHERE "created_at" < NOW();
```

---

## API Endpoints

### 1. Mark Single Event as Read

**Endpoint:** `PATCH /api/events/[id]/mark-read`

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/events/123/mark-read
```

**Response:**
```json
{
  "id": 123,
  "title": "Event title",
  "unread": false,
  ...
}
```

---

### 2. Mark All Events as Read

**Endpoint:** `PATCH /api/events/mark-all-read`

**Mark all events as read:**
```bash
curl -X PATCH http://localhost:3000/api/events/mark-all-read \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Mark all events in a topic as read:**
```bash
curl -X PATCH http://localhost:3000/api/events/mark-all-read \
  -H "Content-Type: application/json" \
  -d '{"topicId": 1}'
```

**Response:**
```json
{
  "success": true,
  "count": 42  // Number of events marked as read
}
```

---

## Usage Examples

### Query Unread Events

**Get all unread events:**
```typescript
const unreadEvents = await prisma.event.findMany({
  where: { unread: true },
  orderBy: { createdAt: 'desc' }
});
```

**Get unread events for a specific topic:**
```typescript
const unreadEvents = await prisma.event.findMany({
  where: {
    topicId: 1,
    unread: true
  },
  orderBy: { createdAt: 'desc' }
});
```

**Count unread events:**
```typescript
const unreadCount = await prisma.event.count({
  where: { unread: true }
});
```

**Count unread events by topic:**
```typescript
const unreadByTopic = await prisma.event.groupBy({
  by: ['topicId'],
  where: { unread: true },
  _count: { id: true }
});
```

---

### Mark Events as Read

**Mark single event as read:**
```typescript
await prisma.event.update({
  where: { id: eventId },
  data: { unread: false }
});
```

**Mark all events in a topic as read:**
```typescript
await prisma.event.updateMany({
  where: { topicId: 1 },
  data: { unread: false }
});
```

**Mark specific events as read:**
```typescript
await prisma.event.updateMany({
  where: {
    id: { in: [1, 2, 3, 4, 5] }
  },
  data: { unread: false }
});
```

---

## RSS Polling Integration

The RSS poller automatically marks new events as unread:

```typescript
// lib/rss-poller.ts
await prisma.event.create({
  data: {
    title: item.title || 'Untitled',
    summary: item.contentSnippet || item.content || item.description || null,
    eventUrl: item.link || null,
    topicId: source.topicId,
    unread: true  // ✨ All new RSS events are unread
  }
});
```

---

## Frontend Integration

### Display Unread Badge

```tsx
// Show unread count
const unreadCount = events.filter(e => e.unread).length;

<div>
  Events {unreadCount > 0 && (
    <span className="badge">{unreadCount}</span>
  )}
</div>
```

### Visual Indicator

```tsx
// Highlight unread events
<div className={event.unread ? 'font-bold' : 'font-normal'}>
  {event.title}
</div>
```

### Mark as Read on Click

```tsx
async function handleEventClick(eventId: number) {
  // Mark as read
  await fetch(`/api/events/${eventId}/mark-read`, {
    method: 'PATCH'
  });

  // Update local state
  setEvents(events.map(e =>
    e.id === eventId ? { ...e, unread: false } : e
  ));
}
```

---

## Testing

### Test the Migration

```bash
# Apply migration
./apply-unread-migration.sh

# Verify in Prisma Studio
npx prisma studio
# Check the Event model - you should see the 'unread' column
```

### Test Creating Events

```bash
# Poll RSS feeds (creates new events as unread)
./quick-test-rss.sh poll

# Check created events
npx tsx -e "
import { prisma } from './lib/db';
const events = await prisma.event.findMany({
  where: { unread: true },
  take: 5,
  orderBy: { createdAt: 'desc' }
});
console.log('Unread events:', events.length);
events.forEach(e => console.log('-', e.title));
await prisma.\$disconnect();
"
```

### Test Mark as Read

```bash
# Mark event 123 as read
curl -X PATCH http://localhost:3000/api/events/123/mark-read

# Mark all events as read
curl -X PATCH http://localhost:3000/api/events/mark-all-read \
  -H "Content-Type: application/json" \
  -d '{}'

# Mark all events in topic 1 as read
curl -X PATCH http://localhost:3000/api/events/mark-all-read \
  -H "Content-Type: application/json" \
  -d '{"topicId": 1}'
```

---

## Database Queries

### Get Unread Count per Topic

```sql
SELECT
  t.id as topic_id,
  t.title as topic_title,
  COUNT(e.id) as unread_count
FROM topics t
LEFT JOIN events e ON e.topic_id = t.id AND e.unread = true
GROUP BY t.id, t.title
ORDER BY unread_count DESC;
```

### Get Recently Created Unread Events

```sql
SELECT
  e.id,
  e.title,
  e.created_at,
  t.title as topic_title
FROM events e
JOIN topics t ON t.id = e.topic_id
WHERE e.unread = true
ORDER BY e.created_at DESC
LIMIT 10;
```

### Mark Old Events as Read

```sql
-- Mark events older than 7 days as read
UPDATE events
SET unread = false
WHERE created_at < NOW() - INTERVAL '7 days'
  AND unread = true;
```

---

## Files Modified/Created

### Modified Files
- `prisma/schema.prisma` - Added `unread` field and index
- `lib/rss-poller.ts` - Set `unread: true` for new events

### Created Files
- `add_unread_migration.sql` - SQL migration file
- `apply-unread-migration.sh` - Migration script
- `app/api/events/[id]/mark-read/route.ts` - Mark single event as read
- `app/api/events/mark-all-read/route.ts` - Mark multiple events as read
- `UNREAD_EVENTS_FEATURE.md` - This documentation

---

## Summary

✅ **Database Schema**
- Added `unread` boolean field (default: `true`)
- Added index on `unread` for performance
- `createdAt` timestamp already exists

✅ **RSS Integration**
- All new RSS events marked as `unread: true`

✅ **API Endpoints**
- Mark single event as read
- Mark all events as read (optionally filtered by topic)

✅ **Migration Tools**
- SQL migration file
- Automated migration script
- Manual migration instructions

---

## Next Steps

1. **Apply the migration:**
   ```bash
   ./apply-unread-migration.sh
   ```

2. **Test event creation:**
   ```bash
   ./quick-test-rss.sh poll
   ```

3. **Verify in Prisma Studio:**
   ```bash
   npx prisma studio
   ```

4. **Implement frontend:**
   - Show unread count badge
   - Highlight unread events
   - Mark as read on click
   - "Mark all as read" button
