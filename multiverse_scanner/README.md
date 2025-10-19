# MultiversX YOLO Trader

Automated trading bot that monitors database events and executes trades on MultiversX DEX.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- `.env` file configured (see below)
- `wallet.pem` file with your MultiversX wallet
- **Database tables created** (run Prisma migrations first!)

### Important: Setup Database Tables First

Before running the Docker containers, you MUST create the database tables:

```bash
# Go to parent directory
cd /home/wojtek/side/berlin_hack/synk

# Run Prisma migrations
npx prisma migrate dev

# OR if migrations exist, just push schema:
npx prisma db push
```

### Environment Variables

Create a `.env` file with:

```bash
# MultiversX Configuration
NETWORK=testnet
PROXY_URL=https://testnet-gateway.multiversx.com
PRIVATE_KEY_PEM=wallet.pem
POOL_MAP='{}'

# Database Configuration
DATABASE_URL=postgresql://synk_user:synk_password@db:5432/synk_db
POSTGRES_DB=synk_db
POSTGRES_USER=synk_user
POSTGRES_PASSWORD=synk_password
POSTGRES_PORT=5432

# OpenAI API Key (for AI summaries)
OPENAI_API_KEY=your-openai-api-key-here
```

### Running with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f yolo-trader

# Stop
docker-compose down
```

### Running without Docker

```bash
# Install dependencies
pip install -r requirements.txt

# Run the trader
python -m yolo_trader
```

## How It Works

1. Polls database every 30 seconds
2. Finds topics with `multiverse_yolo_mode = true`
3. Checks for unread events in those topics
4. Executes trades (sells 0.001 WEGLD) when news detected
5. Generates AI summary using OpenAI
6. Records trade in database with transaction hash

## Testing

```bash
# Insert mock data (topics + events)
python mock_setup.py

# Watch the trader execute trades
docker-compose logs -f yolo-trader
```

## Files

- `yolo_trader.py` - Main trading bot
- `trade.py` - Transaction execution logic
- `mock_setup.py` - Test data generator
- `check_tx.py` - Transaction inspection utility
- `Dockerfile` - Container image definition
- `docker-compose.yml` - Service orchestration
