# 🚀 Quick Start Guide

Get your Healthcare Scheduler backend running in 5 minutes!

## Step 1: Prerequisites

Install required tools:

```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

## Step 2: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Note your **Project URL** and **Service Role Key** from Settings → API

## Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - At least one AI API key (OpenAI, Anthropic, or Google)
```

## Step 4: Run Setup Script

```bash
# Make scripts executable
chmod +x setup.sh test-endpoints.sh

# Run automated setup
./setup.sh
# Follow the prompts and enter your project reference ID
```

**Or manually:**

```bash
# 1. Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# 2. Push database migrations
supabase db push

# 3. Set secrets
supabase secrets set OPENAI_API_KEY=your_key

# 4. Deploy functions
supabase functions deploy
```

## Step 5: Test Your Backend

```bash
# Test all endpoints
./test-endpoints.sh YOUR_PROJECT_REF

# Or test manually with curl
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/handle-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"message": "I need help with anxiety"}'
```

## Step 6: Verify Database

1. Go to Supabase Dashboard → Table Editor
2. Check tables exist:
   - ✅ `therapists` (should have 8 sample therapists)
   - ✅ `inquiries`
   - ✅ `appointments`

## 🎉 You're Ready!

Your backend is now live at:
- **Chat**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/handle-chat`
- **Find Therapist**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/find-therapist`
- **Book**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/book-appointment`
- **Admin**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-admin-data`

## Next Steps

1. **Connect Frontend**: Use these endpoints in your React app
2. **Add Admin User**: Create user in Supabase Auth
3. **Google Calendar**: Set up OAuth for calendar integration
4. **Customize**: Modify therapist data, add more fields, etc.

## Troubleshooting

### Functions won't deploy
```bash
# Check logs
supabase functions logs handle-chat

# Redeploy specific function
supabase functions deploy handle-chat
```

### Database issues
```bash
# Reset and reapply migrations
supabase db reset
```

### Can't find project reference
- Go to Supabase Dashboard → Settings → General
- Look for "Reference ID"

## 📚 More Help

- [Full README](./README.md)
- [API Documentation](./API.md)
- [Supabase Docs](https://supabase.com/docs)

