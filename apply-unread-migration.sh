#!/bin/bash

echo "🔄 Applying unread field migration..."
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

echo "📊 Applying migration to database..."
echo ""

# Apply the SQL migration
psql "$DATABASE_URL" -f add_unread_migration.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "🔄 Regenerating Prisma Client..."
  npx prisma generate
  echo ""
  echo "✅ Done! The 'unread' field is now available on all events."
  echo ""
  echo "📝 Next steps:"
  echo "  - All new events will be marked as unread by default"
  echo "  - Existing events are marked as unread (change in SQL if needed)"
  echo "  - Implement mark-as-read functionality in your API"
else
  echo ""
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi
