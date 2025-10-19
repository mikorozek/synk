# Cron Setup for RSS Polling

## What Does Cron Do?

The cron job periodically calls your RSS polling endpoint (`POST /api/poll-rss`) to:
1. Check which RSS sources need polling (not polled in 15+ minutes)
2. Fetch new items from those RSS feeds
3. Create events in your database
4. Update polling metadata

---

## Quick Setup

### Automated Setup (Recommended)
```bash
./setup-cron.sh
```

This will detect your environment and set up the appropriate scheduling system.

---

## Manual Setup Options

### Option 1: Crontab (Traditional Linux Cron)

**Poll every minute:**
```bash
# Edit crontab
crontab -e

# Add this line:
* * * * * curl -s -X POST http://localhost:3000/api/poll-rss >> /tmp/rss-poll.log 2>&1
```

**Poll every 15 minutes:**
```bash
*/15 * * * * curl -s -X POST http://localhost:3000/api/poll-rss >> /tmp/rss-poll.log 2>&1
```

**View logs:**
```bash
tail -f /tmp/rss-poll.log
```

**List current crontab:**
```bash
crontab -l
```

**Remove crontab entry:**
```bash
crontab -e
# Delete the line, save and exit
```

---

### Option 2: Systemd Timer (Modern Linux)

**Create service file:** `/etc/systemd/system/rss-poll.service`
```ini
[Unit]
Description=RSS Polling Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s -X POST http://localhost:3000/api/poll-rss
StandardOutput=journal
StandardError=journal
```

**Create timer file:** `/etc/systemd/system/rss-poll.timer`
```ini
[Unit]
Description=RSS Polling Timer
Requires=rss-poll.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
AccuracySec=1s

[Install]
WantedBy=timers.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable rss-poll.timer
sudo systemctl start rss-poll.timer
```

**Check status:**
```bash
sudo systemctl status rss-poll.timer
sudo systemctl list-timers rss-poll.timer
```

**View logs:**
```bash
sudo journalctl -u rss-poll.service -f
```

---

### Option 3: Watch Command (Development Only)

**Start the watcher:**
```bash
./watch-poll-rss.sh
```

**With custom interval (seconds):**
```bash
./watch-poll-rss.sh http://localhost:3000/api/poll-rss 60
```

**Stop:**
```
Press Ctrl+C
```

---

### Option 4: Docker + Ofelia (Docker Environments)

**Add to docker-compose.yml:**
```yaml
services:
  scheduler:
    image: mcuadros/ofelia:latest
    depends_on:
      - app
    command: daemon --docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels:
      ofelia.job-exec.rss-poll.schedule: "@every 1m"
      ofelia.job-exec.rss-poll.container: "synk-app-1"
      ofelia.job-exec.rss-poll.command: "curl -s -X POST http://localhost:3000/api/poll-rss"
```

---

### Option 5: Cloud Cron Services (Production)

**cron-job.org** (Free)
1. Go to https://cron-job.org
2. Create account
3. Add new cron job:
   - Title: RSS Polling
   - URL: `https://your-domain.com/api/poll-rss`
   - Method: POST
   - Schedule: Every 1 minute

**EasyCron** (Free tier available)
1. Go to https://www.easycron.com
2. Create account
3. Add cron job with URL and schedule

**AWS EventBridge** (AWS)
```yaml
Rule:
  ScheduleExpression: rate(1 minute)
  Targets:
    - Arn: !Ref MyApiGateway
      HttpParameters:
        PathParameters:
          - poll-rss
```

**Vercel Cron** (if deployed on Vercel)
```json
// vercel.json
{
  "crons": [{
    "path": "/api/poll-rss",
    "schedule": "* * * * *"
  }]
}
```

---

## Cron Schedule Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**Examples:**
```bash
* * * * *        # Every minute
*/5 * * * *      # Every 5 minutes
*/15 * * * *     # Every 15 minutes
0 * * * *        # Every hour (at minute 0)
0 */6 * * *      # Every 6 hours
0 0 * * *        # Daily at midnight
0 9 * * 1        # Every Monday at 9 AM
```

---

## Recommended Schedule

### For Development:
**Every minute** - Quick feedback, endpoint handles 15-min logic
```bash
* * * * * curl -s -X POST http://localhost:3000/api/poll-rss
```

### For Production:
**Every minute** - Ensures timely polling, minimal overhead
```bash
* * * * * curl -s -X POST https://your-domain.com/api/poll-rss
```

**Why every minute?**
- Endpoint is fast when no sources need polling (~50ms)
- Sources only polled when 15+ minutes have elapsed
- Ensures sources are polled as soon as they're ready
- Better than "every 15 minutes" which can miss the exact timing

---

## Monitoring & Logging

### Basic Logging
```bash
# Append to log file
* * * * * curl -s -X POST http://localhost:3000/api/poll-rss >> /var/log/rss-poll.log 2>&1
```

### Log with Timestamp
```bash
* * * * * echo "[$(date)] Starting RSS poll" >> /var/log/rss-poll.log && curl -s -X POST http://localhost:3000/api/poll-rss >> /var/log/rss-poll.log 2>&1
```

### Log Only HTTP Status
```bash
* * * * * curl -s -X POST http://localhost:3000/api/poll-rss -o /dev/null -w "%{http_code}\n" >> /var/log/rss-poll-status.log 2>&1
```

### Log Full Response (for debugging)
```bash
* * * * * curl -s -X POST http://localhost:3000/api/poll-rss | tee -a /var/log/rss-poll-response.log
```

### View Logs
```bash
# Tail log file
tail -f /var/log/rss-poll.log

# View last 50 lines
tail -n 50 /var/log/rss-poll.log

# Search for errors
grep -i error /var/log/rss-poll.log

# Count successful polls today
grep "$(date +%Y-%m-%d)" /var/log/rss-poll.log | wc -l
```

---

## Testing Cron Setup

### 1. Test Endpoint Manually
```bash
curl -v -X POST http://localhost:3000/api/poll-rss
```

Expected output:
```json
{
  "polled": 3,
  "successful": 3,
  "failed": 0,
  "newEvents": 12,
  "errors": [],
  "duration": 2.5
}
```

### 2. Test Cron Entry (wait 1-2 minutes)
```bash
# Check if cron is running
sudo systemctl status cron

# Check cron logs
sudo tail -f /var/log/syslog | grep CRON
```

### 3. Verify Polling is Working
```bash
# Check database for new events
npx tsx -e "
import { prisma } from './lib/db';
const events = await prisma.event.findMany({
  where: { createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
  orderBy: { createdAt: 'desc' }
});
console.log(\`Found \${events.length} events created in last 5 minutes\`);
await prisma.\$disconnect();
"
```

### 4. Check Source Metadata
```bash
# Verify sources are being updated
npx tsx -e "
import { prisma } from './lib/db';
const sources = await prisma.source.findMany({
  where: { type: 'RSS' },
  select: { id: true, sourceUrl: true, lastFetchedAt: true }
});
sources.forEach(s => {
  console.log(\`Source \${s.id}: last polled \${s.lastFetchedAt || 'never'}\`);
});
await prisma.\$disconnect();
"
```

---

## Troubleshooting

### Cron Not Running
```bash
# Check if cron service is running
sudo systemctl status cron

# Start cron if stopped
sudo systemctl start cron

# Enable cron on boot
sudo systemctl enable cron
```

### Endpoint Not Reachable
```bash
# Test connectivity
curl -I http://localhost:3000/api/poll-rss

# Check if app is running
ps aux | grep node

# Check app logs
docker logs synk-app-1 -f
```

### No Events Being Created
```bash
# Check if sources exist
./quick-test-rss.sh status

# Add test sources
npx tsx setup-test-rss-sources.ts

# Manually trigger poll
curl -X POST http://localhost:3000/api/poll-rss
```

### Permission Denied
```bash
# Make sure cron has write access to log file
sudo touch /var/log/rss-poll.log
sudo chmod 666 /var/log/rss-poll.log

# Or use /tmp (world-writable)
* * * * * curl -s -X POST http://localhost:3000/api/poll-rss >> /tmp/rss-poll.log 2>&1
```

---

## Security Considerations

### Production Checklist

1. **Add Authentication**
   - Use API key or internal-only access
   - Example: Add middleware to check API key header

2. **Rate Limiting**
   - Prevent abuse of polling endpoint
   - Use packages like `express-rate-limit`

3. **HTTPS Only**
   - Never use HTTP in production
   - Use environment variable for endpoint URL

4. **Monitoring**
   - Set up alerts for failures
   - Monitor polling duration
   - Track error rates

5. **Logging**
   - Log all polling activity
   - Rotate log files
   - Monitor disk usage

---

## Example Production Crontab

```bash
# RSS Polling - runs every minute
# Logs to syslog, rotates automatically
* * * * * curl -s -X POST \
  -H "X-API-Key: ${RSS_POLL_API_KEY}" \
  https://your-domain.com/api/poll-rss \
  -o /dev/null -w "\%{http_code}\n" \
  | logger -t rss-poll

# View logs with:
# sudo tail -f /var/log/syslog | grep rss-poll
```

---

## Summary

**Quick Start:**
```bash
# Automated setup
./setup-cron.sh

# Or manual setup
crontab -e
# Add: * * * * * curl -s -X POST http://localhost:3000/api/poll-rss >> /tmp/rss-poll.log 2>&1
```

**Testing:**
```bash
# Watch live polling (development)
./watch-poll-rss.sh
```

**Monitoring:**
```bash
# Check logs
tail -f /tmp/rss-poll.log

# Check database
./quick-test-rss.sh status
```

**Recommended:**
- Poll every 1 minute
- Log to file for debugging
- Monitor for errors
- Add authentication in production
