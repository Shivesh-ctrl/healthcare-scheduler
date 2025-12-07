# 🚀 Deploy to Vercel - Quick Start

## ⚡ Fastest Method: Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy Frontend
```bash
cd frontend
vercel
```

**Follow the prompts:**
- Set up and deploy? → **Yes**
- Which scope? → (select your account)
- Link to existing project? → **No**
- Project name? → **healthcare-scheduler-frontend**
- Directory? → **./** (current directory)
- Override settings? → **No**

### Step 3: Add Environment Variables

**Option A: Via CLI (Recommended)**
```bash
# Add first variable
vercel env add VITE_SUPABASE_URL
# Paste: https://ljxugwfzkbjlrjwpglnx.supabase.co
# Select: Production, Preview, Development (all three)

# Add second variable
vercel env add VITE_SUPABASE_ANON_KEY
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4
# Select: Production, Preview, Development (all three)
```

**Option B: Via Dashboard**
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Go to Settings → Environment Variables
4. Add both variables

### Step 4: Deploy to Production
```bash
vercel --prod
```

**Done!** You'll get a URL like: `https://healthcare-scheduler-frontend.vercel.app`

---

## 📋 Alternative: GitHub + Vercel

If you prefer using GitHub:

1. **Create GitHub repo**: https://github.com/new
2. **Push code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/healthcare-scheduler.git
   git push -u origin main
   ```
3. **Deploy on Vercel**:
   - Go to https://vercel.com
   - Import from GitHub
   - Set **Root Directory**: `frontend`
   - Add environment variables
   - Deploy!

---

## ✅ After Deployment

Test your live site:
- Home: `https://your-app.vercel.app`
- Chat: `https://your-app.vercel.app/chat`
- Admin: `https://your-app.vercel.app/admin`

---

## 🎯 Quick Command Summary

```bash
# Install
npm install -g vercel

# Deploy
cd frontend
vercel

# Add env vars
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Production deploy
vercel --prod
```

**That's it!** 🎉
