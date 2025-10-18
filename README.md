# Synk - AI Web Monitor

A Next.js application for monitoring topics across the web and receiving notifications about relevant events.

## Quick Start

```bash
# Start the application (migrations run automatically!)
docker compose up -d

# Access the app
open http://localhost:3000
```

That's it! Database migrations and seeding happen automatically on startup.

## Making Database Changes

When you edit `prisma/schema.prisma`:

```bash
./migrate.sh your_migration_name
```

**Example:**
```bash
# Edit prisma/schema.prisma to add a field
./migrate.sh add_description_field
```

See [QUICK_START.md](QUICK_START.md) for detailed workflows and [MIGRATION_SETUP.md](MIGRATION_SETUP.md) for technical details

## Local Development (without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL database running locally

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## Database Schema

The application uses three main tables:

- **Topics**: User-defined monitoring topics (`id`, `title`, `prompt`)
- **Events**: Detected events for topics (`id`, `title`, `summary`, `event_url`, `topic_id`)
- **Sources**: Monitoring sources for topics (`id`, `source_url`, `type`, `topic_id`)

## API Endpoints

- `GET /api/topics` - List all topics
- `POST /api/topics` - Create new topic
- `GET /api/events` - Get all recent events
- `GET /api/events/[topicId]` - Get events for specific topic

## Development Commands

```bash
# Database operations
npm run db:migrate      # Run database migrations
npm run db:generate     # Generate Prisma client
npm run db:seed         # Seed database with sample data
npm run db:studio       # Open Prisma Studio

# Application
npm run dev             # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
```

## Docker Commands

```bash
# Start development environment
docker compose up --build

# View logs
docker compose logs -f app

# Access app container
docker compose exec app sh

# Stop services
docker compose down
```