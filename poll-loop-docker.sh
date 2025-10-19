#!/bin/bash

# Poll loop script for RSS and Static Site polling (Docker version)
# Polls both endpoints every 30 seconds from inside the Docker container using node/npm

# Configuration
POLL_INTERVAL=30
RSS_ENDPOINT="http://localhost:3000/api/poll-rss"
STATIC_ENDPOINT="http://localhost:3000/api/poll-static-sites"
LOG_FILE="${LOG_FILE:-poll-loop.log}"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local message="[$timestamp] $1"
    echo -e "$message" | tee -a "$LOG_FILE"
}

# Function to poll an endpoint using Node.js fetch
poll_endpoint() {
    local endpoint=$1
    local endpoint_name=$2

    log "${BLUE}=== Polling $endpoint_name ===${NC}"

    # Use Node.js to make the request
    local result=$(node -e "
        const startTime = Date.now();
        fetch('$endpoint', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            .then(res => res.json().then(body => ({ status: res.status, body })))
            .then(({ status, body }) => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(JSON.stringify({ status, body, duration }));
            })
            .catch(err => {
                console.log(JSON.stringify({ status: 'ERROR', body: { error: err.message } }));
            });
    " 2>&1)

    # Parse the result
    local http_code=$(echo "$result" | node -e "
        const stdin = require('fs').readFileSync(0, 'utf-8');
        try {
            const data = JSON.parse(stdin);
            console.log(data.status);
        } catch (e) {
            console.log('ERROR');
        }
    " 2>/dev/null)

    local body=$(echo "$result" | node -e "
        const stdin = require('fs').readFileSync(0, 'utf-8');
        try {
            const data = JSON.parse(stdin);
            console.log(JSON.stringify(data.body, null, 2));
        } catch (e) {
            console.log(stdin);
        }
    " 2>/dev/null)

    local duration=$(echo "$result" | node -e "
        const stdin = require('fs').readFileSync(0, 'utf-8');
        try {
            const data = JSON.parse(stdin);
            console.log(data.duration || '0.00');
        } catch (e) {
            console.log('0.00');
        }
    " 2>/dev/null)

    # Log the attempt
    if [ "$http_code" = "200" ]; then
        log "${GREEN}✓ $endpoint_name successful (HTTP $http_code, ${duration}s)${NC}"
        log "Response:"
        echo "$body" | tee -a "$LOG_FILE"
    else
        log "${RED}✗ $endpoint_name failed (HTTP $http_code)${NC}"
        log "Response:"
        echo "$body" | tee -a "$LOG_FILE"
    fi

    echo "" | tee -a "$LOG_FILE"
}

# Function to handle cleanup on exit
cleanup() {
    log "${YELLOW}Stopping poll loop...${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Main loop
log "${GREEN}Starting poll loop (Docker version)...${NC}"
log "RSS Endpoint: $RSS_ENDPOINT"
log "Static Sites Endpoint: $STATIC_ENDPOINT"
log "Poll Interval: ${POLL_INTERVAL}s"
log "Log File: $LOG_FILE"
echo "" | tee -a "$LOG_FILE"

iteration=1
while true; do
    log "${YELLOW}>>> Iteration #$iteration <<<${NC}"

    # Poll RSS endpoint
    poll_endpoint "$RSS_ENDPOINT" "RSS Feed Polling"

    # Poll Static Sites endpoint
    poll_endpoint "$STATIC_ENDPOINT" "Static Site Polling"

    log "${BLUE}Waiting ${POLL_INTERVAL}s before next poll...${NC}"
    echo "---" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    sleep "$POLL_INTERVAL"
    iteration=$((iteration + 1))
done
