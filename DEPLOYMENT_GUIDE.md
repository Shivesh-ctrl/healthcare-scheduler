# 🚀 Complete Deployment Guide

This guide will help you deploy the Healthcare Scheduler to GitHub, Supabase, and Vercel.

---

## Step 1: Create GitHub Repository

### Option A: Using GitHub Website

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `healthcare-scheduler` (or your preferred name)
3. **Visibility**: Choose Public or Private
4. **DO NOT** initialize with README, .gitignore, or license
5. Click **Create repository**

### Option B: Using GitHub CLI (if installed)

```bash
gh repo create healthcare-scheduler --public --source=. --remote=origin --push
```

---

## Step 2: Push Code to GitHub

```bash
# Navigate to project directory
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main

# Add all files
git add .

# Commit
git commit -m "Initial commit: Healthcare Scheduler"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/healthcare-scheduler.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 3: Set Up Supabase Backend

### 3.1 Create New Supabase Project

1. **Go to Supabase**: https://supabase.com/dashboard
2. Click **New Project**
3. **Fill in details**:
   - Name: `healthcare-scheduler`
   - Database Password: Create a strong password (save it!)
   - Region: Choose closest to you
   - Pricing Plan: Free tier is fine for development
4. Click **Create new project**
5. Wait for project to be ready (2-3 minutes)

### 3.2 Install Supabase CLI

```bash
# Install via Homebrew (Mac)
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

### 3.3 Link to Supabase Project

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main

# Login to Supabase
supabase login

# Link to your project (get PROJECT_REF from Supabase dashboard URL)
# Example: https://supabase.com/dashboard/project/xxxxx
supabase link --project-ref YOUR_PROJECT_REF
```

### 3.4 Deploy Database Migrations

```bash
# Push migrations to Supabase
supabase db push
```

### 3.5 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy handle-chat
supabase functions deploy book-appointment
supabase functions deploy find-therapist
supabase functions deploy get-admin-data
supabase functions deploy cancel-appointment
```

### 3.6 Set Environment Secrets

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
# Required secrets:
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Optional (for Google Calendar):
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**To add secrets via CLI:**
```bash
supabase secrets set GOOGLE_AI_API_KEY=your_key_here --project-ref YOUR_PROJECT_REF
```

### 3.7 Get Your Supabase Credentials

1. Go to Supabase Dashboard → Settings → API
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...`

---

## Step 4: Configure Frontend Environment

Create `frontend/.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Replace with your actual Supabase credentials from Step 3.7**

---

## Step 5: Deploy Frontend to Vercel

### 5.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 5.2 Deploy via Vercel Website

1. **Go to Vercel**: https://vercel.com/new
2. **Import Git Repository**:
   - Connect your GitHub account
   - Select `healthcare-scheduler` repository
   - Click **Import**

3. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables**:
   - `VITE_SUPABASE_URL`: `https://YOUR_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: Your anon key

5. Click **Deploy**

### 5.3 Deploy via Vercel CLI

```bash
cd frontend
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? healthcare-scheduler
# - Directory? ./frontend
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Redeploy with env vars
vercel --prod
```

---

## Step 6: Test Your Deployment

1. **Test Frontend**: Visit your Vercel URL
2. **Test Chat**: Try the AI chat interface
3. **Test Booking**: Try booking an appointment
4. **Test Admin**: Log into admin dashboard

---

## 🔧 Troubleshooting

### Frontend not connecting to backend
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel environment variables
- Verify Supabase project is active
- Check browser console for errors

### Edge Functions not working
- Verify functions are deployed: `supabase functions list`
- Check function logs in Supabase Dashboard → Edge Functions → Logs
- Verify secrets are set correctly

### Database errors
- Ensure migrations are deployed: `supabase db push`
- Check database in Supabase Dashboard → Table Editor

---

## 📚 Useful Commands

```bash
# Supabase
supabase functions deploy          # Deploy all functions
supabase functions list            # List deployed functions
supabase functions logs <name>     # View function logs
supabase db push                   # Push migrations
supabase secrets list              # List secrets

# Git
git add .
git commit -m "message"
git push origin main

# Vercel
vercel                             # Deploy preview
vercel --prod                      # Deploy to production
vercel env ls                      # List environment variables
```

---

## ✅ Checklist

- [ ] GitHub repository created and code pushed
- [ ] Supabase project created
- [ ] Database migrations deployed
- [ ] Edge functions deployed
- [ ] Environment secrets set in Supabase
- [ ] Frontend `.env` configured
- [ ] Vercel project created and deployed
- [ ] Vercel environment variables set
- [ ] All features tested

---

**Need help?** Check the logs:
- **Vercel**: Dashboard → Deployments → Logs
- **Supabase**: Dashboard → Edge Functions → Logs
- **Browser**: Developer Console (F12)

