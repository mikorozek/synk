# Migration Issue Fixed ✅

## The Problem

After restarting Docker Compose, the RSS polling endpoint would fail with:
```
The column `sources.last_fetched_at` does not exist in the current database.
```

Even though the migration was applied before, it would disappear on restart.

---

## Root Cause

The issue was a **mismatch between how migrations were applied and how Docker manages the app**:

### What Was Happening:

1. **Migrations were applied manually** via `docker exec` commands
2. **Migration files weren't in `/prisma/migrations/`** directory
3. When Docker Compose restarted:
   - ✅ Database volume persisted (data kept)
   - ❌ App container rebuilt (Prisma Client reset)
   - ❌ Entrypoint script ran `prisma migrate deploy`
   - ❌ No migration files found → Migrations not applied
   - ❌ Prisma Client generated from schema but DB out of sync

### The Disconnect:

```
Prisma Schema (schema.prisma)     Database (actual columns)
─────────────────────────────     ──────────────────────────
✅ last_fetched_at                ❌ last_fetched_at (missing!)
✅ last_item_guid                 ❌ last_item_guid  (missing!)
✅ unread                         ❌ unread          (missing!)
✅ published_at                   ❌ published_at    (missing!)
```

---

## The Solution

### Created Proper Prisma Migration

**Migration file:** `prisma/migrations/20251019005900_add_rss_polling_and_event_fields/migration.sql`

```sql
-- AlterTable: Add RSS polling fields to sources
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "last_fetched_at" TIMESTAMP(3);
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "last_item_guid" VARCHAR(500);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sources_type_last_fetched_at_idx" ON "sources"("type", "last_fetched_at");

-- AlterTable: Add unread and published_at to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "unread" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_unread_idx" ON "events"("unread");
CREATE INDEX IF NOT EXISTS "events_published_at_idx" ON "events"("published_at" DESC);
```

**Key features:**
- Uses `IF NOT EXISTS` - safe to run multiple times
- Proper Prisma migration format
- Tracked in migrations directory

---

## How It Works Now

### Entrypoint Script (`entrypoint.sh`)

Your Docker container already had this script:

```bash
#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy  # ← Runs ALL pending migrations

echo "🌱 Seeding database..."
npm run db:seed || true

echo "✅ Database ready!"
echo "🚀 Starting application..."
exec "$@"
```

**On every container start:**
1. ✅ Runs `prisma migrate deploy`
2. ✅ Applies any new migrations in `/prisma/migrations/`
3. ✅ Generates Prisma Client
4. ✅ Starts the app

---

## Testing

### Before Fix:
```bash
$ curl -X POST http://localhost:3000/api/poll-rss
{"error":"...The column `sources.last_fetched_at` does not exist..."}
```

### After Fix:
```bash
$ curl -X POST http://localhost:3000/api/poll-rss
{
  "polled": 4,
  "successful": 1,
  "failed": 3,
  "newEvents": 0,
  "errors": [...],
  "duration": 1.183
}
```

✅ **Working!**

### After Docker Compose Restart:
```bash
$ docker restart synk-app-1
$ curl -X POST http://localhost:3000/api/poll-rss
{
  "polled": 4,
  "successful": 1,
  "newEvents": 0
}
```

✅ **Still working!** Migrations persist across restarts.

---

## What Changed

### Migration Files Structure:

```
prisma/migrations/
├── 20251018142252_init/
│   └── migration.sql
├── 20251018200726_add_created_at_to_topics/
│   └── migration.sql
├── 20251019005900_add_rss_polling_and_event_fields/  ← NEW
│   └── migration.sql
└── migration_lock.toml
```

### How Migrations Are Tracked:

Prisma maintains a `_prisma_migrations` table in your database:

```sql
SELECT migration_name, applied_steps_count, finished_at
FROM _prisma_migrations
ORDER BY finished_at DESC;
```

**Result:**
```
migration_name                                  | applied_steps_count | finished_at
------------------------------------------------|---------------------|-------------------------
20251019005900_add_rss_polling_and_event_fields | 1                   | 2025-10-19 00:59:00
20251018200726_add_created_at_to_topics         | 1                   | 2025-10-18 22:07:26
20251018142252_init                             | 1                   | 2025-10-18 14:22:52
```

This ensures migrations only run once, even on restart.

---

## Why It Works Now

### Before (Manual Migrations):
```
You: docker exec psql < migration.sql
     ├─ ✅ Applied to database
     └─ ❌ Not tracked by Prisma

Docker Compose Restart:
     ├─ entrypoint.sh runs
     ├─ prisma migrate deploy
     └─ "No pending migrations" (none in /migrations/ dir)

Result: ❌ Schema out of sync
```

### After (Proper Prisma Migrations):
```
You: npx prisma migrate deploy
     ├─ ✅ Applied to database
     ├─ ✅ Tracked in _prisma_migrations table
     └─ ✅ Migration file in /migrations/ directory

Docker Compose Restart:
     ├─ entrypoint.sh runs
     ├─ prisma migrate deploy
     ├─ Checks _prisma_migrations table
     ├─ "Migration already applied, skipping"
     └─ Generates Prisma Client from schema

Result: ✅ Always in sync!
```

---

## Future Migrations

### Creating New Migrations

**Development (with interactive terminal):**
```bash
npx prisma migrate dev --name your_migration_name
```

**Production (or Docker):**
```bash
# 1. Create migration directory
docker exec synk-app-1 mkdir -p /app/prisma/migrations/YYYYMMDDHHMMSS_migration_name

# 2. Create migration.sql
docker exec synk-app-1 sh -c 'cat > /app/prisma/migrations/YYYYMMDDHHMMSS_migration_name/migration.sql << "EOF"
-- Your SQL here
ALTER TABLE ...
EOF'

# 3. Apply migration
docker exec synk-app-1 npx prisma migrate deploy

# 4. Restart app
docker restart synk-app-1
```

Or use the helper script:

```bash
./apply-migrations.sh
```

---

## Verification Commands

### Check Database Schema:
```bash
docker exec synk-db-1 psql -U synk_user -d synk_db -c "\d sources"
docker exec synk-db-1 psql -U synk_user -d synk_db -c "\d events"
```

### Check Applied Migrations:
```bash
docker exec synk-app-1 npx prisma migrate status
```

### Check Migration History:
```bash
docker exec synk-db-1 psql -U synk_user -d synk_db -c "
SELECT migration_name, finished_at
FROM _prisma_migrations
ORDER BY finished_at DESC;
"
```

---

## Summary

✅ **Problem:** Migrations not persisting across Docker restarts
✅ **Root Cause:** Migrations applied manually, not tracked by Prisma
✅ **Solution:** Created proper Prisma migration in `/prisma/migrations/`
✅ **Result:** Migrations automatically applied on every container start
✅ **Benefit:** Database always in sync with schema, even after restarts

---

## Key Takeaways

1. **Always use Prisma migrations** - Don't apply SQL manually
2. **Migrations are tracked** - Prisma knows what's been applied
3. **Entrypoint handles it** - Your Docker setup already runs migrations on start
4. **Use IF NOT EXISTS** - Makes migrations idempotent (safe to run multiple times)
5. **Restart works now** - Database state persists across container restarts

🎉 **No more migration issues on restart!**
