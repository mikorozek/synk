#!/bin/bash

# Simple RSS polling watcher for development
# Polls every 60 seconds and displays results

ENDPOINT="${1:-http://localhost:3000/api/poll-rss}"
INTERVAL="${2:-60}"

echo "🕐 RSS Polling Watcher"
echo "======================"
echo ""
echo "Endpoint: $ENDPOINT"
echo "Interval: ${INTERVAL}s"
echo ""
echo "Press Ctrl+C to stop"
echo ""
echo "======================================"
echo ""

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Polling RSS feeds..."

    response=$(curl -s -X POST "$ENDPOINT")

    if [ $? -eq 0 ]; then
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo "❌ Failed to reach endpoint"
    fi

    echo ""
    echo "--------------------------------------"
    echo "Next poll in ${INTERVAL}s..."
    echo ""

    sleep "$INTERVAL"
done
