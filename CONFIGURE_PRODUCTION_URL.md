# 🔧 Configure Production URL - Step by Step

## ✅ Step 1: Add Environment Variable to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Find your project: `healthcare-scheduler-frontend-bsu6`

2. **Open Project Settings**
   - Click on your project
   - Go to **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Add New Variable**
   - Click **"Add New"** button
   - **Name**: `VITE_PRODUCTION_URL`
   - **Value**: `https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app`
   - **Environment**: Select all (Production, Preview, Development)
   - Click **"Save"**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment
   - Click **"Redeploy"**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Link to your project
cd frontend
vercel link

# Add environment variable
vercel env add VITE_PRODUCTION_URL production
# When prompted, enter: https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app

# Redeploy
vercel --prod
```

---

## ✅ Step 2: Configure Supabase Auth URLs

### Via Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/auth/url-configuration

2. **Update Site URL**
   - Find **"Site URL"** field
   - Change from: `http://localhost:3000` (or whatever it is)
   - To: `https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app`
   - Click **"Save"**

3. **Add Redirect URLs**
   - Scroll to **"Redirect URLs"** section
   - Click **"Add URL"** for each:
     - `https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app/chat`
     - `https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app/admin`
     - `https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app/oauth/callback`
   - Click **"Save"** after adding each

---

## ✅ Step 3: Verify Configuration

1. **Check Vercel Environment Variables**
   - Go to Vercel → Project → Settings → Environment Variables
   - Verify `VITE_PRODUCTION_URL` is set

2. **Check Supabase Auth URLs**
   - Go to Supabase → Auth → URL Configuration
   - Verify Site URL and Redirect URLs are correct

3. **Test Login Flow**
   - Visit your production URL
   - Click "Sign Up" or "Login"
   - Complete the flow
   - Verify redirects go to production URL (not localhost)

---

## 🎯 Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Auth Config**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/auth/url-configuration
- **Your Production URL**: https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app

---

## ✅ Done!

After completing these steps, login and signup will redirect to your production URL instead of localhost.
