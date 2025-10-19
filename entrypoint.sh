#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma db push

echo "✅ Database ready!"
echo "🚀 Starting development server..."
npm run dev
