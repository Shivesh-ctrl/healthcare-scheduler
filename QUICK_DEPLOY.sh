#!/bin/bash

# Quick Deployment Script for Healthcare Scheduler
# This script helps you deploy to GitHub, Supabase, and Vercel

echo "🚀 Healthcare Scheduler Deployment Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: GitHub Setup
echo -e "${YELLOW}Step 1: GitHub Repository Setup${NC}"
echo "----------------------------------------"
echo ""
echo "Please create a new repository on GitHub:"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: healthcare-scheduler"
echo "3. DO NOT initialize with README, .gitignore, or license"
echo "4. Click 'Create repository'"
echo ""
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter your repository name (default: healthcare-scheduler): " REPO_NAME
REPO_NAME=${REPO_NAME:-healthcare-scheduler}

echo ""
echo "Adding remote and pushing to GitHub..."
git remote add origin https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git 2>/dev/null || git remote set-url origin https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
    echo "Repository URL: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
else
    echo -e "${YELLOW}⚠️  Failed to push. Make sure the repository exists on GitHub.${NC}"
fi

echo ""
echo "=========================================="
echo ""
echo -e "${YELLOW}Step 2: Supabase Setup${NC}"
echo "----------------------------------------"
echo ""
echo "1. Create a new project at: https://supabase.com/dashboard"
echo "2. Get your Project Reference ID from the URL"
echo "3. Run these commands:"
echo ""
echo "   supabase login"
echo "   supabase link --project-ref YOUR_PROJECT_REF"
echo "   supabase db push"
echo "   supabase functions deploy"
echo ""
echo "4. Set secrets in Supabase Dashboard:"
echo "   - GOOGLE_AI_API_KEY"
echo ""
read -p "Press Enter when Supabase is set up..."

echo ""
echo "=========================================="
echo ""
echo -e "${YELLOW}Step 3: Frontend Environment Setup${NC}"
echo "----------------------------------------"
echo ""
echo "Create frontend/.env with:"
echo "VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co"
echo "VITE_SUPABASE_ANON_KEY=your_anon_key"
echo ""
read -p "Press Enter when .env is created..."

echo ""
echo "=========================================="
echo ""
echo -e "${YELLOW}Step 4: Vercel Deployment${NC}"
echo "----------------------------------------"
echo ""
echo "1. Go to: https://vercel.com/new"
echo "2. Import your GitHub repository: ${REPO_NAME}"
echo "3. Configure:"
echo "   - Framework: Vite"
echo "   - Root Directory: frontend"
echo "   - Build Command: npm run build"
echo "   - Output Directory: dist"
echo "4. Add environment variables:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "5. Click Deploy"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test your Vercel deployment"
echo "2. Test the chat interface"
echo "3. Test appointment booking"
echo ""
echo "For detailed instructions, see DEPLOYMENT_GUIDE.md"

