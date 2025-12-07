#!/bin/bash

# Test script for Edge Functions
echo "🧪 Testing Healthcare Scheduler API Endpoints"
echo "=============================================="
echo ""

if [ -z "$1" ]; then
    echo "Usage: ./test-endpoints.sh <your-project-ref>"
    echo "Example: ./test-endpoints.sh abcdefghijklmnop"
    exit 1
fi

PROJECT_REF=$1
BASE_URL="https://$PROJECT_REF.supabase.co/functions/v1"

# Load service role key from .env
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found"
    exit 1
fi

echo "Base URL: $BASE_URL"
echo ""

# Test 1: Handle Chat
echo "1️⃣  Testing /handle-chat..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/handle-chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "message": "I have been feeling very anxious lately and need help. I have Aetna insurance."
  }')

echo "Response: $CHAT_RESPONSE" | jq '.'
INQUIRY_ID=$(echo $CHAT_RESPONSE | jq -r '.inquiryId')
echo "✅ Inquiry ID: $INQUIRY_ID"
echo ""

# Test 2: Find Therapist
echo "2️⃣  Testing /find-therapist..."
curl -s -X POST "$BASE_URL/find-therapist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{
    \"inquiryId\": \"$INQUIRY_ID\",
    \"specialty\": \"anxiety\",
    \"insurance\": \"aetna\",
    \"limit\": 3
  }" | jq '.'
echo ""

# Test 3: Get Admin Data
echo "3️⃣  Testing /get-admin-data..."
curl -s -X GET "$BASE_URL/get-admin-data" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.stats'
echo ""

echo "✅ All tests completed!"
echo ""
echo "📝 Note: To test /book-appointment, you need:"
echo "   - A valid inquiry ID"
echo "   - A therapist ID from find-therapist"
echo "   - Patient details and time slot"

