# 🚀 Deploy Frontend to Vercel

## ✅ Backend Status: COMPLETE

**All Edge Functions Deployed:**
- ✅ handle-chat (v89)
- ✅ book-appointment (v36)
- ✅ find-therapist (v30)
- ✅ get-admin-data (v31)
- ✅ google-oauth-callback (v25)
- ✅ get-oauth-url (v25)

**Secrets Configured:**
- ✅ GOOGLE_AI_API_KEY
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ All required secrets set

---

## 📦 Frontend: Deploy to Vercel

### Method 1: Vercel CLI (Fastest)

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Deploy
```bash
cd frontend
vercel
```

**Follow prompts:**
- Set up and deploy? → **Yes**
- Which scope? → (select your account)
- Link to existing project? → **No**
- Project name? → **healthcare-scheduler-frontend**
- Directory? → **./**
- Override settings? → **No**

#### Step 3: Add Environment Variables

```bash
# Add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_URL
# When prompted, paste: https://ljxugwfzkbjlrjwpglnx.supabase.co
# Select: Production, Preview, Development (all three)

# Add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_ANON_KEY
# When prompted, paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4
# Select: Production, Preview, Development (all three)
```

#### Step 4: Deploy to Production
```bash
vercel --prod
```

**Done!** You'll get a production URL.

---

### Method 2: Vercel Dashboard (GitHub Required)

#### Step 1: Push to GitHub
```bash
# Create GitHub repo first at https://github.com/new
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/healthcare-scheduler.git
git branch -M main
git push -u origin main
```

#### Step 2: Deploy on Vercel
1. Go to: https://vercel.com
2. Sign up/Login (use "Continue with GitHub")
3. Click **"Add New Project"**
4. Import **healthcare-scheduler** repository
5. **Configure:**
   - **Root Directory**: `frontend` ← IMPORTANT!
   - **Framework**: Vite (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
6. **Environment Variables:**
   - Click "Environment Variables"
   - Add:
     - `VITE_SUPABASE_URL` = `https://ljxugwfzkbjlrjwpglnx.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4`
   - Select all environments (Production, Preview, Development)
7. Click **"Deploy"**

---

## ✅ Environment Variables Summary

### For Vercel:
```
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4
```

---

## 🎯 Quick Deploy Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Production deploy
vercel --prod
```

---

## ✅ After Deployment

**Test your live site:**
- Home: `https://your-app.vercel.app`
- Chat: `https://your-app.vercel.app/chat`
- Admin: `https://your-app.vercel.app/admin`

**Backend is already live at:**
- `https://ljxugwfzkbjlrjwpglnx.supabase.co`

---

## 🎉 Deployment Complete!

**Backend:** ✅ Deployed (Supabase Edge Functions)
**Frontend:** ⏳ Deploy to Vercel (follow steps above)
**Database:** ✅ Configured (8 therapists ready)

