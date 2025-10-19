#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate dev --name init 

echo "✅ Database ready!"
echo "🚀 Starting application..."
exec "$@"
