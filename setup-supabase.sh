#!/bin/bash

# Supabase Setup Script
# Run this AFTER you've created a Supabase project and logged in

echo "🚀 Supabase Backend Setup"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if logged in
if ! supabase projects list &>/dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo "Run: supabase login"
    exit 1
fi

# Get project reference
echo -e "${YELLOW}Step 1: Link to Supabase Project${NC}"
read -p "Enter your Supabase Project Reference ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project Reference is required!"
    exit 1
fi

echo ""
echo "Linking to project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

if [ $? -ne 0 ]; then
    echo "❌ Failed to link project"
    exit 1
fi

echo -e "${GREEN}✅ Project linked!${NC}"
echo ""

# Deploy database
echo -e "${YELLOW}Step 2: Deploying Database Migrations${NC}"
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy migrations"
    exit 1
fi

echo -e "${GREEN}✅ Database deployed!${NC}"
echo ""

# Deploy functions
echo -e "${YELLOW}Step 3: Deploying Edge Functions${NC}"
supabase functions deploy

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy functions"
    exit 1
fi

echo -e "${GREEN}✅ Functions deployed!${NC}"
echo ""

# List functions
echo -e "${YELLOW}Step 4: Verifying Deployment${NC}"
supabase functions list

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set secrets in Supabase Dashboard:"
echo "   - GOOGLE_AI_API_KEY (Required)"
echo ""
echo "2. Get your API credentials from Dashboard → Settings → API"
echo "   - Project URL"
echo "   - anon public key"
echo ""
echo "3. Create frontend/.env with these credentials"
echo ""
echo "4. Deploy frontend to Vercel"

