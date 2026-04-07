#!/bin/bash
# Test script for WooCommerce Bulk Sync endpoint
# Usage: ./test-bulk-sync.sh <store_id> [consumer_key] [consumer_secret]

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
STORE_ID="${1:-myshop.com}"
CONSUMER_KEY="${2:-}"
CONSUMER_SECRET="${3:-}"

echo "================================"
echo "WooCommerce Bulk Sync Test"
echo "================================"
echo "Backend URL: $BACKEND_URL"
echo "Store ID: $STORE_ID"
echo ""

# Build request body
BODY="{\"store_id\": \"$STORE_ID\""

if [ -n "$CONSUMER_KEY" ] && [ -n "$CONSUMER_SECRET" ]; then
  BODY="$BODY, \"consumer_key\": \"$CONSUMER_KEY\", \"consumer_secret\": \"$CONSUMER_SECRET\""
fi

BODY="$BODY}"

echo "Request Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

echo "Sending request..."
START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/woocommerce/bulk-sync" \
  -H "Content-Type: application/json" \
  -d "$BODY")

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "Response (received in ${ELAPSED}s):"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Parse response
if echo "$RESPONSE" | jq -e '.status == "success"' >/dev/null 2>&1; then
  echo "✓ Bulk sync succeeded!"
  SYNCED=$(echo "$RESPONSE" | jq '.results.synced')
  FAILED=$(echo "$RESPONSE" | jq '.results.failed')
  TOTAL=$(echo "$RESPONSE" | jq '.results.total')
  echo "  - Synced: $SYNCED"
  echo "  - Failed: $FAILED"
  echo "  - Total: $TOTAL"
else
  echo "✗ Bulk sync failed"
  echo "$RESPONSE" | jq '.error' 2>/dev/null || echo "Unknown error"
fi
