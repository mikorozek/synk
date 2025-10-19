# Quick Start Guide

## Database Migrations ✅

All required migrations have been applied:
- ✅ RSS polling fields (`last_fetched_at`, `last_item_guid`) on sources table
- ✅ Unread field on events table
- ✅ All indexes created

---

## Testing RSS Polling

### 1. Setup Test RSS Sources
```bash
npx tsx setup-test-rss-sources.ts
```

### 2. Test Polling
```bash
./quick-test-rss.sh poll
```

### 3. Check Status
```bash
./quick-test-rss.sh status
```

### 4. Reset and Re-poll (for testing)
```bash
./quick-test-rss.sh reset
./quick-test-rss.sh poll
```

---

## Documentation Files

- `RSS_POLLING_SPEC.md` - Original specification
- `RSS_TESTING_GUIDE.md` - Complete testing guide
- `UNREAD_EVENTS_FEATURE.md` - Unread events documentation
- `MIGRATION_APPLIED.md` - Migration details
- `QUICK_START.md` - This file
