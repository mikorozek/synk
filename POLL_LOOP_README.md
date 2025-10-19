# Poll Loop Scripts

Two scripts are provided to continuously poll the RSS and Static Site polling endpoints every 30 seconds and log all attempts.

## Scripts

- **`poll-loop.sh`**: Uses `curl` - for local development or systems with curl installed
- **`poll-loop-docker.sh`**: Uses Node.js `fetch` - for running inside Docker containers

## Usage

### Docker Usage (Recommended)

```bash
# Run from inside the Docker container
docker exec -it synk-app-1 bash -c 'cd /app && ./poll-loop-docker.sh'
```

This will:
- Poll `http://localhost:3000/api/poll-rss` and `http://localhost:3000/api/poll-static-sites` from inside the container
- Run every 30 seconds
- Log to `poll-loop.log` in the `/app` directory

### Local Development (with curl)

```bash
./poll-loop.sh
```

This will:
- Poll `http://localhost:3000/api/poll-rss` and `http://localhost:3000/api/poll-static-sites`
- Run every 30 seconds
- Log to `poll-loop.log` in the current directory

### Custom Configuration

You can customize the behavior using environment variables:

```bash
# Change poll interval to 60 seconds
POLL_INTERVAL=60 ./poll-loop.sh

# Use different base URL
BASE_URL=http://localhost:3001 ./poll-loop.sh

# Use custom log file
LOG_FILE=/var/log/synk-poll.log ./poll-loop.sh

# Combine multiple options
BASE_URL=http://localhost:3001 POLL_INTERVAL=60 LOG_FILE=custom.log ./poll-loop.sh
```

### Running in Docker (Detailed)

```bash
# Interactive mode (see output in real-time)
docker exec -it synk-app-1 bash -c 'cd /app && ./poll-loop-docker.sh'

# View the log file from outside the container
docker exec synk-app-1 cat /app/poll-loop.log

# Tail the log in real-time
docker exec synk-app-1 tail -f /app/poll-loop.log
```

### Running in Background

#### In Docker (Detached)

```bash
# Run in background using docker exec with -d flag
docker exec -d synk-app-1 bash -c 'cd /app && ./poll-loop-docker.sh'

# View logs
docker exec synk-app-1 cat /app/poll-loop.log

# Tail logs
docker exec synk-app-1 tail -f /app/poll-loop.log

# To stop: find and kill the process
docker exec synk-app-1 pkill -f poll-loop-docker
```

#### Locally

```bash
# Run in background and redirect output
./poll-loop.sh > /dev/null 2>&1 &

# Save the PID to stop later
echo $! > poll-loop.pid

# To stop later
kill $(cat poll-loop.pid)
```

#### Using nohup for Persistent Background Execution

```bash
# Run with nohup
nohup ./poll-loop.sh &

# Output will be in nohup.out and poll-loop.log
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Base URL of the application |
| `POLL_INTERVAL` | `30` | Seconds between poll attempts |
| `LOG_FILE` | `poll-loop.log` | Path to log file |

## Log Format

The script logs:
- Timestamp for each poll attempt
- HTTP status code
- Response body (pretty-printed with `jq` if available)
- Success/failure indicators with color coding

Example log entry:
```
[2025-10-19 10:30:00] === Polling RSS Feed Polling ===
[2025-10-19 10:30:01] ✓ RSS Feed Polling successful (HTTP 200)
Response: {"polled":5,"successful":5,"failed":0,"newEvents":2,"duration":"1.23s"}
{
  "polled": 5,
  "successful": 5,
  "failed": 0,
  "newEvents": 2,
  "duration": "1.23s"
}
```

## Stopping the Script

Press `Ctrl+C` to gracefully stop the poll loop.

## Requirements

### For `poll-loop.sh` (local/curl version)
- `curl` (required)
- `jq` (optional, for pretty-printing JSON responses)
- Bash 4.0 or higher

### For `poll-loop-docker.sh` (Docker/Node version)
- Node.js with fetch support (Node 18+)
- Bash 4.0 or higher
- *(No curl required)*

## Troubleshooting

### Connection Refused

If you see connection errors:
```bash
# Check if the app is running
curl http://localhost:3000/api/poll-rss

# For Docker Compose
docker ps | grep synk-app
docker logs synk-app-1
```

### Permission Denied

```bash
# Make script executable
chmod +x poll-loop.sh
```

### Log File Permission Issues

```bash
# Use a different log file location
LOG_FILE=~/poll-loop.log ./poll-loop.sh
```
