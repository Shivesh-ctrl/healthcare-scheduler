#!/bin/bash

# Quick Deployment Script for Healthcare Scheduler

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   🚀  HEALTHCARE SCHEDULER - DEPLOYMENT                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
else
    echo "✅ Vercel CLI already installed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check backend status
echo "🔍 Checking backend status..."
cd backend
supabase functions list --project-ref ljxugwfzkbjlrjwpglnx | grep ACTIVE | wc -l | xargs -I {} echo "✅ {} functions are ACTIVE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Frontend deployment
echo "🚀 Ready to deploy frontend to Vercel!"
echo ""
echo "Environment variables needed:"
echo "  VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co"
echo "  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4"
echo ""
echo "Choose deployment method:"
echo "  1. Deploy via Vercel CLI (run: cd frontend && vercel)"
echo "  2. Deploy via Vercel Dashboard (https://vercel.com)"
echo ""
echo "📚 See DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
