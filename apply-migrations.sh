#!/bin/bash

set -e

echo "🔄 Applying Database Migrations"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  exit 1
fi

# Load DATABASE_URL from .env
export $(grep -v '^#' .env | grep DATABASE_URL | xargs)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env"
  exit 1
fi

echo "📊 Current database structure:"
echo "------------------------------"
echo ""

# Check current sources table
echo "Sources table columns:"
psql "$DATABASE_URL" -c "\d sources" -t | grep -v "^$" | head -10

echo ""
echo "Events table columns:"
psql "$DATABASE_URL" -c "\d events" -t | grep -v "^$" | head -10

echo ""
echo "------------------------------"
echo ""
echo "🚀 Applying migrations..."
echo ""

# Apply the migration
psql "$DATABASE_URL" -f migrations-to-apply.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migrations applied successfully!"
  echo ""
  echo "📊 Updated database structure:"
  echo "------------------------------"
  echo ""

  echo "Sources table now has:"
  psql "$DATABASE_URL" -c "\d sources" -t | grep -E "(last_fetched_at|last_item_guid)" || echo "  (RSS fields not found - check migration)"

  echo ""
  echo "Events table now has:"
  psql "$DATABASE_URL" -c "\d events" -t | grep "unread" || echo "  (unread field not found - check migration)"

  echo ""
  echo "------------------------------"
  echo ""
  echo "🔄 Regenerating Prisma Client..."
  npx prisma generate

  echo ""
  echo "✅ All done!"
  echo ""
  echo "📝 Summary of changes:"
  echo "  ✅ Added last_fetched_at to sources table"
  echo "  ✅ Added last_item_guid to sources table"
  echo "  ✅ Added index on (type, last_fetched_at)"
  echo "  ✅ Added unread field to events table"
  echo "  ✅ Added index on unread"
  echo "  ✅ Regenerated Prisma Client"
  echo ""
  echo "🎯 Next steps:"
  echo "  1. Restart your dev server: npm run dev"
  echo "  2. Test RSS polling: ./quick-test-rss.sh poll"
  echo "  3. Check Prisma Studio: npx prisma studio"
else
  echo ""
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi
