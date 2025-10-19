#!/bin/bash

# Test script for static site polling functionality
# Make sure you have FIRECRAWL_API_KEY set in your .env file

echo "🔍 Testing Static Site Polling..."
echo "=================================="

# Test the API endpoint
echo "📡 Calling /api/poll-static-sites endpoint..."

curl -X POST http://localhost:3000/api/poll-static-sites \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Test completed!"
echo ""
echo "💡 To see detailed logs, check your application console output."
echo "💡 Make sure you have Website type sources in your database to see polling in action."
