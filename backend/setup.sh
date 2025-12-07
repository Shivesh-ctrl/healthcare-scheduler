#!/bin/bash

echo "🏥 Healthcare Scheduler Backend Setup"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "📦 Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file - Please fill in your credentials"
    echo ""
    echo "Required variables:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - At least one AI API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY)"
    echo ""
    read -p "Press Enter after you've updated .env file..."
fi

echo "🔗 Linking to Supabase project..."
echo "If you haven't created a project yet, go to: https://supabase.com/dashboard"
echo ""

read -p "Enter your Supabase project reference ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference ID is required"
    exit 1
fi

# Link to Supabase project
supabase link --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "❌ Failed to link to Supabase project"
    exit 1
fi

echo "✅ Linked to Supabase project"
echo ""

# Push database migrations
echo "📊 Pushing database migrations..."
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Failed to push database migrations"
    exit 1
fi

echo "✅ Database migrations applied"
echo ""

# Set function secrets
echo "🔐 Setting up function secrets..."
echo ""

# Load .env file
source .env

if [ ! -z "$OPENAI_API_KEY" ]; then
    echo "Setting OPENAI_API_KEY..."
    supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY" --project-ref $PROJECT_REF
fi

if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo "Setting ANTHROPIC_API_KEY..."
    supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" --project-ref $PROJECT_REF
fi

if [ ! -z "$GOOGLE_AI_API_KEY" ]; then
    echo "Setting GOOGLE_AI_API_KEY..."
    supabase secrets set GOOGLE_AI_API_KEY="$GOOGLE_AI_API_KEY" --project-ref $PROJECT_REF
fi

if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
    echo "Setting GOOGLE_CLIENT_ID..."
    supabase secrets set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" --project-ref $PROJECT_REF
fi

if [ ! -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "Setting GOOGLE_CLIENT_SECRET..."
    supabase secrets set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" --project-ref $PROJECT_REF
fi

echo "✅ Secrets configured"
echo ""

# Deploy functions
echo "🚀 Deploying Edge Functions..."
supabase functions deploy --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "⚠️  Some functions may have failed to deploy"
else
    echo "✅ All functions deployed successfully"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📡 Your Edge Functions are available at:"
echo "  - https://$PROJECT_REF.supabase.co/functions/v1/handle-chat"
echo "  - https://$PROJECT_REF.supabase.co/functions/v1/find-therapist"
echo "  - https://$PROJECT_REF.supabase.co/functions/v1/book-appointment"
echo "  - https://$PROJECT_REF.supabase.co/functions/v1/get-admin-data"
echo ""
echo "📚 Next steps:"
echo "  1. Test the endpoints using curl or Postman"
echo "  2. Connect your React frontend"
echo "  3. Set up admin authentication"
echo ""

