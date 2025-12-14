# 🚀 Quick Setup Instructions

Your project is ready to deploy! Follow these steps:

---

## ✅ Step 1: Create GitHub Repository

1. Go to: **https://github.com/new**
2. Repository name: `healthcare-scheduler` (or your choice)
3. **DO NOT** check "Add a README file"
4. Click **"Create repository"**

---

## ✅ Step 2: Push Code to GitHub

Run these commands (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/healthcare-scheduler.git

# Push code
git branch -M main
git push -u origin main
```

---

## ✅ Step 3: Set Up Supabase Backend

### 3.1 Create Supabase Project

1. Go to: **https://supabase.com/dashboard**
2. Click **"New Project"**
3. Fill in:
   - Name: `healthcare-scheduler`
   - Database Password: (save this!)
   - Region: Choose closest
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup

### 3.2 Get Your Project Reference

From your Supabase project URL:
- Example: `https://supabase.com/dashboard/project/abcdefghijklmnop`
- Your Project Ref: `abcdefghijklmnop`

### 3.3 Install Supabase CLI

```bash
# Mac (Homebrew)
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

### 3.4 Link and Deploy

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main

# Login
supabase login

# Link to your project (replace PROJECT_REF)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy database
supabase db push

# Deploy functions
supabase functions deploy
```

### 3.5 Set Secrets

Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**:

Add:
- `GOOGLE_AI_API_KEY` = your Google AI API key

Or via CLI:
```bash
supabase secrets set GOOGLE_AI_API_KEY=your_key_here --project-ref YOUR_PROJECT_REF
```

### 3.6 Get API Credentials

Go to **Supabase Dashboard** → **Settings** → **API**:

Copy:
- **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
- **anon public key**: `eyJhbG...`

---

## ✅ Step 4: Configure Frontend

Create `frontend/.env` file:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_from_step_3.6
```

**Replace with your actual values!**

---

## ✅ Step 5: Deploy to Vercel

### Option A: Via Website (Recommended)

1. Go to: **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select your GitHub repository: `healthcare-scheduler`
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add **Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Click **"Deploy"**

### Option B: Via CLI

```bash
cd frontend
npm install -g vercel
vercel

# Follow prompts, then:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

---

## ✅ Step 6: Test

1. Visit your Vercel URL
2. Test the chat interface
3. Try booking an appointment
4. Test admin login

---

## 🔧 Troubleshooting

**Frontend can't connect to backend?**
- Check environment variables in Vercel
- Verify Supabase URL and key are correct

**Functions not working?**
- Check Supabase Dashboard → Edge Functions → Logs
- Verify secrets are set

**Database errors?**
- Make sure migrations ran: `supabase db push`
- Check Supabase Dashboard → Table Editor

---

## 📝 Quick Reference

```bash
# Supabase
supabase functions deploy          # Deploy functions
supabase db push                   # Push migrations
supabase functions logs <name>     # View logs

# Git
git add .
git commit -m "message"
git push origin main

# Vercel
vercel --prod                      # Deploy to production
```

---

**Need detailed instructions?** See `DEPLOYMENT_GUIDE.md`

