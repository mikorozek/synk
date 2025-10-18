# Quick Start Guide

## One Command to Rule Them All

When you change `prisma/schema.prisma`, just run:

```bash
./migrate.sh your_migration_name
```

**Example:**
```bash
# Edit prisma/schema.prisma (add a field, change a table, etc.)

# Then run:
./migrate.sh add_description_field

# That's it! ✅
```

## What It Does

1. ✅ Creates a new migration based on your schema changes
2. ✅ Applies the migration to your database
3. ✅ Rebuilds Docker containers
4. ✅ Regenerates Prisma Client with new TypeScript types

## Alternative: NPM Scripts

If you prefer npm commands:

```bash
# Full rebuild (when you make schema changes)
npm run docker:rebuild

# Quick restart (no schema changes)
npm run docker:restart

# Update schema in running container + restart
npm run schema:update
```

## Common Workflows

### Starting the Project
```bash
docker compose up -d
# Migrations run automatically! 🎉
```

### Adding a New Field
```bash
# 1. Edit prisma/schema.prisma
# model Topic {
#   id          Int    @id @default(autoincrement())
#   prompt      String
#   title       String @db.VarChar(255)
#   description String? // <- Add this
# }

# 2. Run migration
./migrate.sh add_topic_description
```

### Creating a New Table
```bash
# 1. Edit prisma/schema.prisma
# model User {
#   id    Int    @id @default(autoincrement())
#   email String @unique
#   name  String?
# }

# 2. Run migration
./migrate.sh add_user_table
```

### Viewing the Database
```bash
docker exec -it synk-app-1 npx prisma studio
# Opens at http://localhost:5555
```

### Resetting Everything
```bash
# WARNING: Deletes all data!
docker compose down -v
docker compose up -d --build
```

## Troubleshooting

### Migration script fails
Make sure containers are running:
```bash
docker compose ps
```

### Want to see what changed?
Check the migration file:
```bash
cat prisma/migrations/*/migration.sql
```

### Manual migration (if script fails)
```bash
docker exec synk-app-1 npx prisma migrate dev --name your_name
docker compose up -d --build
```

## That's It!

You now have **automatic migrations** with a **single command**. No manual steps, no remembering complex docker commands.

Just edit your schema and run:
```bash
./migrate.sh your_change_name
```
