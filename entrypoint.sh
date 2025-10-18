#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database (if needed)..."
npm run db:seed || echo "⚠️  Seeding skipped or failed (this is okay if data already exists)"

echo "✅ Database ready!"
echo "🚀 Starting application..."
exec "$@"
