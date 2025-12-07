#!/bin/bash

# Google Calendar Configuration Script
# Run this after getting OAuth credentials from Google Cloud Console

echo "📅 Google Calendar Configuration"
echo "=================================="
echo ""

# Check if already in correct directory
if [ ! -f "deno.json" ]; then
    echo "Error: Please run this from the healthcare-scheduler-backend directory"
    exit 1
fi

echo "This script will help you configure Google Calendar integration."
echo ""
echo "Prerequisites:"
echo "  1. ✅ Google Cloud Project created"
echo "  2. ✅ Calendar API enabled"
echo "  3. ✅ OAuth credentials created"
echo ""

read -p "Do you have your Client ID and Client Secret ready? (y/n): " ready

if [[ $ready != "y" && $ready != "Y" ]]; then
    echo ""
    echo "Please complete these steps first:"
    echo "  1. Go to: https://console.cloud.google.com"
    echo "  2. Create project and enable Calendar API"
    echo "  3. Create OAuth 2.0 credentials"
    echo ""
    echo "See SETUP_GOOGLE_CALENDAR_NOW.md for detailed instructions"
    exit 0
fi

echo ""
echo "Enter your Google OAuth credentials:"
echo ""

read -p "Client ID: " client_id
read -p "Client Secret: " client_secret

if [ -z "$client_id" ] || [ -z "$client_secret" ]; then
    echo "❌ Error: Both Client ID and Client Secret are required"
    exit 1
fi

echo ""
echo "Setting Supabase secrets..."
echo ""

# Set Client ID
echo "Setting GOOGLE_CLIENT_ID..."
supabase secrets set GOOGLE_CLIENT_ID="$client_id" --project-ref ljxugwfzkbjlrjwpglnx

if [ $? -ne 0 ]; then
    echo "❌ Failed to set GOOGLE_CLIENT_ID"
    exit 1
fi

# Set Client Secret
echo "Setting GOOGLE_CLIENT_SECRET..."
supabase secrets set GOOGLE_CLIENT_SECRET="$client_secret" --project-ref ljxugwfzkbjlrjwpglnx

if [ $? -ne 0 ]; then
    echo "❌ Failed to set GOOGLE_CLIENT_SECRET"
    exit 1
fi

echo ""
echo "✅ Secrets configured successfully!"
echo ""

# Verify secrets
echo "Verifying secrets..."
supabase secrets list --project-ref ljxugwfzkbjlrjwpglnx | grep GOOGLE

echo ""
echo "📝 Next steps:"
echo ""
echo "1. Update frontend .env file:"
echo "   cd ../healthcare-scheduler-frontend"
echo "   echo 'VITE_GOOGLE_CLIENT_ID=$client_id' >> .env"
echo ""
echo "2. Restart frontend dev server:"
echo "   npm run dev"
echo ""
echo "3. Test booking an appointment!"
echo ""
echo "✅ Backend configuration complete!"
echo ""
echo "See SETUP_GOOGLE_CALENDAR_NOW.md for testing instructions."

