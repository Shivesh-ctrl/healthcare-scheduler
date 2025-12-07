#!/bin/bash

# Test Google Calendar OAuth Integration
# This script tests the OAuth URL generation and verifies setup

echo "🔍 Testing Google Calendar OAuth Integration"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Supabase URL and Anon Key from environment or .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

SUPABASE_URL="${SUPABASE_URL:-https://ljxugwfzkbjlrjwpglnx.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4}"

echo "📋 Configuration:"
echo "   Supabase URL: $SUPABASE_URL"
echo ""

# Test 1: Check if get-oauth-url function exists
echo "Test 1: Checking get-oauth-url function..."
TEST_URL="${SUPABASE_URL}/functions/v1/get-oauth-url?therapist_id=test-id-123"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$TEST_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Function is accessible${NC}"
    echo "   Response: $BODY" | head -c 200
    echo ""
else
    echo -e "${RED}❌ Function returned error${NC}"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 2: Get a real therapist ID from database
echo "Test 2: Fetching therapist from database..."
THERAPIST_QUERY=$(cat <<EOF
SELECT id, name, email 
FROM therapists 
WHERE is_active = true 
LIMIT 1;
EOF
)

# Use Supabase REST API to query
THERAPIST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/get_therapist" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" 2>/dev/null)

# Alternative: Direct table query
THERAPIST_DATA=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/therapists?is_active=eq.true&limit=1&select=id,name,email" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation")

if echo "$THERAPIST_DATA" | grep -q "id"; then
    THERAPIST_ID=$(echo "$THERAPIST_DATA" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    THERAPIST_NAME=$(echo "$THERAPIST_DATA" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Found therapist: $THERAPIST_NAME${NC}"
    echo "   ID: $THERAPIST_ID"
else
    echo -e "${YELLOW}⚠️  Could not fetch therapist from API${NC}"
    echo "   You can manually test with any therapist ID from the database"
    THERAPIST_ID="test-id-123"
fi
echo ""

# Test 3: Generate OAuth URL with real therapist ID
if [ ! -z "$THERAPIST_ID" ] && [ "$THERAPIST_ID" != "test-id-123" ]; then
    echo "Test 3: Generating OAuth URL for therapist..."
    OAUTH_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/functions/v1/get-oauth-url?therapist_id=${THERAPIST_ID}" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json")
    
    if echo "$OAUTH_RESPONSE" | grep -q "oauth_url"; then
        OAUTH_URL=$(echo "$OAUTH_RESPONSE" | grep -o '"oauth_url":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}✅ OAuth URL generated successfully${NC}"
        echo "   URL: ${OAUTH_URL:0:100}..."
        echo ""
        echo -e "${YELLOW}📝 To test the full flow:${NC}"
        echo "   1. Copy this URL and open it in a browser"
        echo "   2. Complete the Google OAuth flow"
        echo "   3. You'll be redirected back to the admin dashboard"
    else
        echo -e "${RED}❌ Failed to generate OAuth URL${NC}"
        echo "   Response: $OAUTH_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping OAuth URL test (no valid therapist ID)${NC}"
fi
echo ""

# Test 4: Check secrets are configured
echo "Test 4: Verifying Supabase secrets..."
SECRETS=$(supabase secrets list 2>/dev/null | grep -E "GOOGLE_CLIENT|VITE_FRONTEND")

if echo "$SECRETS" | grep -q "GOOGLE_CLIENT_ID"; then
    echo -e "${GREEN}✅ GOOGLE_CLIENT_ID is set${NC}"
else
    echo -e "${RED}❌ GOOGLE_CLIENT_ID is missing${NC}"
fi

if echo "$SECRETS" | grep -q "GOOGLE_CLIENT_SECRET"; then
    echo -e "${GREEN}✅ GOOGLE_CLIENT_SECRET is set${NC}"
else
    echo -e "${RED}❌ GOOGLE_CLIENT_SECRET is missing${NC}"
fi

if echo "$SECRETS" | grep -q "VITE_FRONTEND_URL"; then
    echo -e "${GREEN}✅ VITE_FRONTEND_URL is set${NC}"
else
    echo -e "${YELLOW}⚠️  VITE_FRONTEND_URL is missing (optional for testing)${NC}"
fi
echo ""

# Test 5: Check frontend is running
echo "Test 5: Checking frontend server..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Frontend is not running${NC}"
    echo "   Start it with: cd ../frontend && npm run dev"
fi
echo ""

# Summary
echo "============================================"
echo "📊 Test Summary"
echo "============================================"
echo ""
echo "✅ Next Steps:"
echo "   1. Make sure redirect URI is configured in Google Cloud Console:"
echo "      https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback"
echo ""
echo "   2. Test the full flow:"
echo "      - Go to http://localhost:5173/admin"
echo "      - Log in"
echo "      - Click 'Connect Calendar' for any therapist"
echo "      - Complete Google OAuth flow"
echo ""
echo "   3. Verify calendar connection:"
echo "      - Check therapist shows 'Connected' status"
echo "      - Book an appointment"
echo "      - Check therapist's Google Calendar for the event"
echo ""

