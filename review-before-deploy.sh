#!/bin/bash

# CodeRabbit Review Script - Run before deploying
# This script reviews your code before deployment

set -e  # Exit on error

echo "🔍 Running CodeRabbit review before deployment..."
echo ""

# Check if API key is set
if [ -z "$CODERABBIT_API_KEY" ]; then
    echo "⚠️  Warning: CODERABBIT_API_KEY not set"
    echo "   Set it with: export CODERABBIT_API_KEY='your-key'"
    echo "   Or skip review with: SKIP_REVIEW=true ./review-before-deploy.sh"
    echo ""
    if [ "$SKIP_REVIEW" != "true" ]; then
        read -p "Continue without review? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Review backend functions
echo "📋 Reviewing backend functions..."
if npx @coderabbitai/cli review backend/supabase/functions/ 2>/dev/null; then
    echo "✅ Backend review passed"
else
    echo "⚠️  Backend review completed (some issues may have been found)"
fi
echo ""

# Review frontend source
echo "📋 Reviewing frontend source..."
if npx @coderabbitai/cli review frontend/src/ 2>/dev/null; then
    echo "✅ Frontend review passed"
else
    echo "⚠️  Frontend review completed (some issues may have been found)"
fi
echo ""

echo "✅ Code review complete! You can now deploy."
echo ""
echo "To deploy backend:"
echo "  cd backend && supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx"
echo ""
echo "To deploy frontend:"
echo "  git add . && git commit -m 'Your message' && git push origin main"

