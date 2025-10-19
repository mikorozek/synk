#!/bin/bash

echo "🧪 RSS Polling Test Script"
echo "=========================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test endpoint
ENDPOINT="${1:-http://localhost:3000/api/poll-rss}"

echo -e "${BLUE}Testing endpoint: ${ENDPOINT}${NC}"
echo ""

# Function to call the endpoint and format response
test_poll() {
  local test_number=$1
  echo -e "${YELLOW}Test #${test_number} - $(date '+%H:%M:%S')${NC}"

  response=$(curl -s -X POST "${ENDPOINT}" -H "Content-Type: application/json")

  if [ $? -eq 0 ]; then
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo "❌ Failed to reach endpoint"
  fi

  echo ""
  echo "---"
  echo ""
}

# Run multiple tests
echo "Running 3 polling tests with 5-second intervals..."
echo ""

for i in {1..3}; do
  test_poll $i

  if [ $i -lt 3 ]; then
    echo "⏳ Waiting 5 seconds before next test..."
    sleep 5
  fi
done

echo -e "${GREEN}✅ Testing complete!${NC}"
echo ""
echo "💡 Tips:"
echo "  - First run should poll all RSS sources"
echo "  - Subsequent runs should skip sources (< 15 min elapsed)"
echo "  - Wait 15+ minutes and run again to see new items"
echo "  - Check Prisma Studio to see created Events"
