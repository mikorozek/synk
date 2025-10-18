# Automatic Database Migrations Setup

## What Was Done

This project now automatically runs database migrations when the Docker container starts. This ensures the database schema is always up-to-date without manual intervention.

## Implementation

### 1. Entrypoint Script (`entrypoint.sh`)

Created a shell script that runs before the application starts:

```bash
#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database (if needed)..."
npm run db:seed || echo "⚠️  Seeding skipped or failed (this is okay if data already exists)"

echo "✅ Database ready!"
echo "🚀 Starting application..."
exec "$@"
```

**What it does:**
- `prisma migrate deploy` - Applies any pending migrations to the database (production-safe)
- `npm run db:seed` - Seeds the database with initial data (fails gracefully if data exists)
- `exec "$@"` - Starts the main application command (npm run dev)

### 2. Dockerfile Update

Modified the Dockerfile to use the entrypoint script:

```dockerfile
# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]
```

### 3. Initial Migration

Created the initial migration that sets up the database schema:
- `prisma/migrations/20251018142252_init/migration.sql`

This migration creates:
- `topics` table - Stores user-created topics
- `events` table - Stores notifications/events for each topic
- `sources` table - Stores data sources (RSS, Twitter, etc.) for topics
- Appropriate indexes and foreign key constraints

## How It Works

1. **Container Start**: When you run `docker compose up`, the database container starts first
2. **Health Check**: Docker waits for PostgreSQL to be healthy
3. **Entrypoint Execution**: The app container starts and runs `entrypoint.sh`
4. **Migration Check**: Prisma checks for pending migrations and applies them
5. **Seeding**: Database is seeded with initial data (if empty)
6. **App Start**: Next.js application starts

## Benefits

✅ **Zero Manual Steps** - No need to remember to run migrations
✅ **Developer Friendly** - Works for all team members automatically
✅ **Production Ready** - `prisma migrate deploy` is safe for production
✅ **Idempotent** - Safe to run multiple times, only applies new migrations
✅ **Error Handling** - Fails fast if migrations have issues

## Usage

### Starting Fresh

```bash
docker compose up -d --build
```

The database will be automatically:
1. Migrated to the latest schema
2. Seeded with initial data

### Adding New Migrations

When you change the Prisma schema:

```bash
# Create a new migration (inside container)
docker exec synk-app-1 npx prisma migrate dev --name your_migration_name

# Or create locally (if you have DATABASE_URL set)
npx prisma migrate dev --name your_migration_name
```

The next time containers restart, the new migration will be applied automatically.

### Checking Migration Status

```bash
# View applied migrations
docker exec synk-app-1 npx prisma migrate status

# View database schema
docker exec synk-app-1 npx prisma db pull
```

## Testing

Verify everything works:

```bash
# Check logs to see migration output
docker logs synk-app-1

# Test the API
curl http://localhost:3000/api/topics

# Should return seeded topics:
# [{"id":1,"title":"AI Developments",...}, {"id":2,"title":"Tech News",...}]
```

## Troubleshooting

### Migrations fail to apply

Check the logs:
```bash
docker logs synk-app-1
```

### Need to reset the database

```bash
# WARNING: This deletes all data
docker compose down -v
docker compose up -d --build
```

### Manual migration in container

```bash
docker exec -it synk-app-1 sh
npx prisma migrate deploy
```

## Alternative Approaches Considered

1. **CI/CD Pipeline** - Run migrations in deployment pipeline (good for production)
2. **Separate Init Container** - Use docker compose with depends_on (more complex)
3. **Application Code** - Run migrations from Node.js code (not recommended)
4. **Manual Process** - Require developers to run migrations manually (error-prone)

We chose the **entrypoint script approach** because it:
- Works in both development and production
- Requires no additional services
- Is transparent and easy to debug
- Follows Docker best practices
