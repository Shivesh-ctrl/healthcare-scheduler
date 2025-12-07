#!/bin/bash

# Complete System Test Script
# Tests all components of Healthcare Scheduler

echo "🧪 Healthcare Scheduler - Complete System Test"
echo "=============================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_URL="https://ljxugwfzkbjlrjwpglnx.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4"

# Test 1: Backend Chat Endpoint
echo -e "${BLUE}1️⃣  Testing Chat Endpoint...${NC}"
CHAT_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/functions/v1/handle-chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{"message": "Hi, I need help with anxiety"}')

if echo "$CHAT_RESPONSE" | grep -q "reply"; then
    echo -e "${GREEN}✅ Chat endpoint working!${NC}"
    INQUIRY_ID=$(echo "$CHAT_RESPONSE" | jq -r '.inquiryId' 2>/dev/null)
    echo "   Inquiry ID: $INQUIRY_ID"
else
    echo -e "${RED}❌ Chat endpoint failed${NC}"
    echo "$CHAT_RESPONSE" | jq '.' 2>/dev/null || echo "$CHAT_RESPONSE"
fi
echo ""

# Test 2: Find Therapist Endpoint
echo -e "${BLUE}2️⃣  Testing Find Therapist Endpoint...${NC}"
THERAPIST_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/functions/v1/find-therapist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{"specialty": "anxiety", "insurance": "bluecross"}')

if echo "$THERAPIST_RESPONSE" | grep -q "therapists"; then
    echo -e "${GREEN}✅ Find therapist endpoint working!${NC}"
    COUNT=$(echo "$THERAPIST_RESPONSE" | jq -r '.count' 2>/dev/null)
    echo "   Found $COUNT therapist(s)"
else
    echo -e "${RED}❌ Find therapist endpoint failed${NC}"
    echo "$THERAPIST_RESPONSE" | jq '.' 2>/dev/null || echo "$THERAPIST_RESPONSE"
fi
echo ""

# Test 3: Frontend Server
echo -e "${BLUE}3️⃣  Testing Frontend Server...${NC}"
FRONTEND_RESPONSE=$(curl -s http://localhost:5173 2>&1)

if echo "$FRONTEND_RESPONSE" | grep -q "html\|root"; then
    echo -e "${GREEN}✅ Frontend server running!${NC}"
    echo "   URL: http://localhost:5173"
else
    echo -e "${YELLOW}⚠️  Frontend server not running${NC}"
    echo "   Start it with: cd frontend && npm run dev"
fi
echo ""

# Test 4: Database Connection
echo -e "${BLUE}4️⃣  Testing Database Connection...${NC}"
DB_TEST=$(curl -s -X POST "${BACKEND_URL}/functions/v1/find-therapist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{"specialty": "anxiety", "insurance": "aetna"}')

if echo "$DB_TEST" | grep -q "therapists"; then
    echo -e "${GREEN}✅ Database connection working!${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=================="
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: http://localhost:5173"
echo ""
echo -e "${GREEN}✅ All critical tests completed!${NC}"
echo ""
echo "🎯 Next Steps:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Click 'Start Chat' to test the full flow"
echo "   3. Book an appointment to test booking"
echo "   4. Login to admin dashboard to view data"
echo ""

