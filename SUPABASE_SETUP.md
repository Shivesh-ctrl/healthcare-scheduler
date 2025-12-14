# 🚀 Supabase Backend Setup Guide

## Step 1: Create Supabase Project

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `healthcare-scheduler`
   - **Database Password**: Create a strong password (save it somewhere safe!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free tier is fine for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be ready

---

## Step 2: Get Your Project Reference

1. Once your project is created, look at the URL:
   - Example: `https://supabase.com/dashboard/project/abcdefghijklmnop`
   - Your **Project Reference** is: `abcdefghijklmnop`

2. **Copy this Project Reference** - you'll need it in the next step!

---

## Step 3: Login and Link Your Project

Open your terminal and run:

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main

# Login to Supabase (will open browser)
supabase login

# Link to your project (replace YOUR_PROJECT_REF with your actual project reference)
supabase link --project-ref YOUR_PROJECT_REF
```

---

## Step 4: Deploy Database Migrations

This will create all the database tables, schemas, and data:

```bash
supabase db push
```

This applies all migrations in `supabase/migrations/`:
- Initial schema
- Therapists table
- Appointments table
- Inquiries table
- Users table
- Demo therapist data
- etc.

---

## Step 5: Deploy Edge Functions

Deploy all your API endpoints:

```bash
# Deploy all functions at once
supabase functions deploy

# Or deploy individually:
supabase functions deploy handle-chat
supabase functions deploy book-appointment
supabase functions deploy find-therapist
supabase functions deploy get-admin-data
supabase functions deploy cancel-appointment
supabase functions deploy connect-google
supabase functions deploy google-callback
supabase functions deploy oauth-callback
```

---

## Step 6: Set Environment Secrets

Your functions need API keys to work. Set them in Supabase:

### Option A: Via Dashboard (Easiest)

1. Go to your Supabase Dashboard
2. Navigate to: **Settings** → **Edge Functions** → **Secrets**
3. Add these secrets:

**Required:**
- `GOOGLE_AI_API_KEY` = Your Google Gemini API key
  - Get it from: https://aistudio.google.com/app/apikey

**Optional (for Google Calendar):**
- `GOOGLE_CLIENT_ID` = Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` = Your Google OAuth Client Secret

### Option B: Via CLI

```bash
# Set Google AI API Key (REQUIRED)
supabase secrets set GOOGLE_AI_API_KEY=your_api_key_here --project-ref YOUR_PROJECT_REF

# Optional: Set Google OAuth credentials
supabase secrets set GOOGLE_CLIENT_ID=your_client_id --project-ref YOUR_PROJECT_REF
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret --project-ref YOUR_PROJECT_REF
```

---

## Step 7: Get Your API Credentials

You'll need these for your frontend `.env` file:

1. Go to: **Settings** → **API**
2. Copy:
   - **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

Save these for the frontend setup!

---

## Step 8: Verify Deployment

Check that everything is working:

```bash
# List deployed functions
supabase functions list

# View function logs
supabase functions logs handle-chat

# Check database
supabase db pull  # This will show your current database structure
```

---

## ✅ Checklist

- [ ] Supabase project created
- [ ] Project linked via CLI
- [ ] Database migrations deployed (`supabase db push`)
- [ ] Edge functions deployed (`supabase functions deploy`)
- [ ] `GOOGLE_AI_API_KEY` secret set
- [ ] Project URL and anon key copied for frontend

---

## 🔧 Troubleshooting

### "Project not found"
- Make sure you're using the correct Project Reference
- Check that you're logged in: `supabase login`

### "Migration failed"
- Check the error message in the terminal
- Make sure your database password is correct
- Try running migrations individually

### "Function deployment failed"
- Check function logs: `supabase functions logs <function-name>`
- Verify your code doesn't have syntax errors
- Make sure you're linked to the correct project

### "Secret not found"
- Verify secrets are set: `supabase secrets list --project-ref YOUR_PROJECT_REF`
- Make sure you're using the correct secret names (case-sensitive)

---

## 📚 Useful Commands

```bash
# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy database
supabase db push

# Deploy all functions
supabase functions deploy

# List functions
supabase functions list

# View logs
supabase functions logs <function-name>

# List secrets
supabase secrets list --project-ref YOUR_PROJECT_REF

# Set secret
supabase secrets set KEY=value --project-ref YOUR_PROJECT_REF
```

---

**Next Step**: After Supabase is set up, configure the frontend with your API credentials and deploy to Vercel!

