#!/bin/bash

# Local Code Review Script - Run before deploying
# This script runs local code checks before deployment

set -e  # Exit on error

echo "🔍 Running code review before deployment..."
echo ""

# Check TypeScript in frontend
echo "📋 Checking TypeScript in frontend..."
cd frontend
if npx tsc --noEmit 2>&1; then
    echo "✅ Frontend TypeScript check passed"
else
    echo "❌ Frontend TypeScript errors found!"
    echo "   Please fix errors before deploying."
    exit 1
fi
cd ..

# Check ESLint in frontend
echo "📋 Running ESLint in frontend..."
cd frontend
if npm run lint 2>&1; then
    echo "✅ Frontend ESLint check passed"
else
    echo "⚠️  Frontend ESLint warnings found (non-blocking)"
fi
cd ..

# Check backend TypeScript (Deno)
echo "📋 Checking backend TypeScript..."
cd backend
if deno check supabase/functions/handle-chat/index.ts 2>&1; then
    echo "✅ Backend TypeScript check passed"
else
    echo "❌ Backend TypeScript errors found!"
    echo "   Please fix errors before deploying."
    exit 1
fi
cd ..

# Check for common issues
echo "📋 Checking for common issues..."

# Check for console.log in production code
if grep -r "console\.log" backend/supabase/functions/ --include="*.ts" | grep -v "//" | grep -v "console.log('✅" | grep -v "console.error" | grep -v "console.warn"; then
    echo "⚠️  Warning: Found console.log statements (consider removing for production)"
else
    echo "✅ No problematic console.log statements found"
fi

# Check for hardcoded secrets
if grep -r "AIzaSy\|sk-\|pk_" backend/supabase/functions/ --include="*.ts" 2>/dev/null; then
    echo "❌ ERROR: Potential hardcoded API keys found!"
    echo "   Please remove and use environment variables."
    exit 1
else
    echo "✅ No hardcoded secrets found"
fi

echo ""
echo "✅ Code review complete! Safe to deploy."
echo ""
echo "To deploy backend:"
echo "  cd backend && supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx"
echo ""
echo "To deploy frontend:"
echo "  git add . && git commit -m 'Your message' && git push origin main"

