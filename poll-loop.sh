#!/bin/bash

# Poll loop script for RSS and Static Site polling
# Polls both endpoints every 30 seconds and logs all attempts

# Configuration
POLL_INTERVAL=30
BASE_URL="${BASE_URL:-http://localhost:3000}"
RSS_ENDPOINT="${BASE_URL}/api/poll-rss"
STATIC_ENDPOINT="${BASE_URL}/api/poll-static-sites"
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

# Function to poll an endpoint
poll_endpoint() {
    local endpoint=$1
    local endpoint_name=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    log "${BLUE}=== Polling $endpoint_name ===${NC}"

    # Make the POST request and capture response
    local response=$(curl -s -w "\n%{http_code}" -X POST "$endpoint" \
        -H "Content-Type: application/json" \
        2>&1)

    # Extract HTTP status code (last line)
    local http_code=$(echo "$response" | tail -n 1)
    # Extract response body (everything except last line)
    local body=$(echo "$response" | head -n -1)

    # Log the attempt
    if [ "$http_code" = "200" ]; then
        log "${GREEN}✓ $endpoint_name successful (HTTP $http_code)${NC}"
        log "Response: $body"

        # Try to pretty print if jq is available
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.' >> "$LOG_FILE" 2>/dev/null || echo "$body" >> "$LOG_FILE"
        else
            echo "$body" >> "$LOG_FILE"
        fi
    else
        log "${RED}✗ $endpoint_name failed (HTTP $http_code)${NC}"
        log "Response: $body"
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
log "${GREEN}Starting poll loop...${NC}"
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
