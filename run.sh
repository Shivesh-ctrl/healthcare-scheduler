#!/bin/bash

# Healthcare Scheduler - Complete Run Script
# This script starts the entire application

echo "🏥 Healthcare Scheduler - Starting Application"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the healthcare-scheduler directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo -e "${BLUE}📋 Checking Prerequisites...${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI not found (backend already deployed)${NC}"
else
    echo -e "${GREEN}✅ Supabase CLI: $(supabase --version)${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Checking Configuration...${NC}"
echo ""

# Check frontend .env
if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✅ Frontend .env found${NC}"
    if grep -q "VITE_SUPABASE_URL" frontend/.env; then
        echo -e "${GREEN}✅ Backend URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend URL not found in frontend/.env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Frontend .env not found${NC}"
fi

# Check backend .env
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ Backend .env found${NC}"
else
    echo -e "${YELLOW}⚠️  Backend .env not found (secrets are in Supabase)${NC}"
fi

echo ""
echo -e "${BLUE}🧪 Testing Backend Connection...${NC}"
echo ""

# Test backend
BACKEND_URL="https://ljxugwfzkbjlrjwpglnx.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4"

TEST_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/functions/v1/handle-chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{"message": "test"}' 2>&1)

if echo "$TEST_RESPONSE" | grep -q "reply"; then
    echo -e "${GREEN}✅ Backend is responding!${NC}"
elif echo "$TEST_RESPONSE" | grep -q "error"; then
    echo -e "${YELLOW}⚠️  Backend responded with error (may be rate limit)${NC}"
    echo "   Response: $(echo $TEST_RESPONSE | jq -r '.error' 2>/dev/null | head -c 100)"
else
    echo -e "${YELLOW}⚠️  Could not verify backend (may be starting)${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Starting Frontend...${NC}"
echo ""
echo -e "${GREEN}Frontend will start at: http://localhost:5173${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start frontend
cd frontend
npm run dev

