# Synk - AI Web Monitor

A Next.js application for monitoring topics across the web and receiving notifications about relevant events.

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git

### Development Setup

1. **Clone and setup environment**
   ```bash
   git clone <repository-url>
   cd ai-web-monitor
   cp .env.example .env
   ```

2. **Start development environment**
   ```bash
   # Start PostgreSQL database and app in development mode
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```

3. **Run database migrations** (in another terminal)
   ```bash
   # Enter the app container
   docker-compose exec app sh
   
   # Run Prisma migrations
   npm run db:migrate
   
   # Optional: Seed database with sample data
   npm run db:seed
   ```

4. **Access the application**
   - App: http://localhost:3000
   - Database: localhost:5432
   - Prisma Studio: `npm run db:studio` (from inside container)

### Production Setup

1. **Build and run production containers**
   ```bash
   docker-compose up --build -d
   ```

2. **Run migrations in production**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

## Local Development (without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL database running locally

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local database URL
   ```

3. **Setup database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development server**
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

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Environment mode | `development` |
| `NEXTAUTH_SECRET` | Secret for authentication | Required in production |

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
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production
docker-compose up --build -d

# View logs
docker-compose logs -f app

# Access app container
docker-compose exec app sh

# Stop services
docker-compose down
```