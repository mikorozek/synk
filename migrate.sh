#!/bin/bash
set -e

echo "🔄 Updating database schema..."

# Check if migration name is provided
if [ -z "$1" ]; then
  echo "❌ Error: Please provide a migration name"
  echo "Usage: ./migrate.sh <migration_name>"
  echo "Example: ./migrate.sh add_user_email"
  exit 1
fi

MIGRATION_NAME=$1

echo "📝 Creating migration: $MIGRATION_NAME"

# Create migration in the running container
docker exec synk-app-1 npx prisma migrate dev --name "$MIGRATION_NAME"

echo "🔨 Rebuilding containers..."

# Rebuild and restart containers (supports both V1 and V2)
if command -v docker-compose &> /dev/null; then
  docker-compose up -d --build
else
  docker compose up -d --build
fi

echo "✅ Done! Migration created and applied."
echo "📁 Check prisma/migrations/ for the new migration file"
