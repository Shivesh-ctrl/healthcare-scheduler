# 🚀 Complete Deployment Guide

## ✅ Docker is NOT Needed!

**Why?**
- **Frontend**: Vercel handles React deployment automatically
- **Backend**: Supabase Edge Functions are serverless (no containers needed)
- **Database**: Supabase PostgreSQL is fully managed

**You only need:**
- Vercel account (free) for frontend
- Supabase account (already set up) for backend

---

## 📊 Current Status

### ✅ Backend (Already Deployed!)
All 6 Edge Functions are **ACTIVE**:
- ✅ handle-chat (v89)
- ✅ book-appointment (v36)
- ✅ find-therapist (v30)
- ✅ get-admin-data (v31)
- ✅ google-oauth-callback (v25)
- ✅ get-oauth-url (v25)

**Backend URL**: `https://ljxugwfzkbjlrjwpglnx.supabase.co`

### ⏳ Frontend (Needs Deployment)
Currently running locally at `http://localhost:5173`

---

## 🎯 Step 1: Prepare Frontend for Vercel

### 1.1 Create Vercel Configuration

Create `vercel.json` in frontend directory (optional but recommended):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 1.2 Environment Variables Needed

You'll need these in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🚀 Step 2: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** (free account)
3. **Click "Add New Project"**
4. **Import Git Repository**:
   - Connect GitHub/GitLab/Bitbucket
   - Or drag & drop the `frontend` folder
5. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. **Add Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://ljxugwfzkbjlrjwpglnx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4`
7. **Click "Deploy"**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? healthcare-scheduler-frontend
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
# Paste: https://ljxugwfzkbjlrjwpglnx.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4

# Redeploy with env vars
vercel --prod
```

---

## ✅ Step 3: Verify Backend Deployment

### Check Functions Status

```bash
cd backend
supabase functions list --project-ref ljxugwfzkbjlrjwpglnx
```

All should show **ACTIVE** status.

### Verify Secrets

```bash
supabase secrets list --project-ref ljxugwfzkbjlrjwpglnx
```

Should show:
- ✅ `GOOGLE_AI_API_KEY`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `GOOGLE_CLIENT_ID` (if using calendar)
- ✅ `GOOGLE_CLIENT_SECRET` (if using calendar)

---

## 🔐 Step 4: Environment Variables Summary

### Frontend (Vercel)
```
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4
```

### Backend (Supabase Secrets - Already Set)
```
GOOGLE_AI_API_KEY=AIzaSyDFCJSnsrCGqd1pJUyRXta_N1lZsX69cqU
SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=(set in Supabase dashboard)
```

---

## 🧪 Step 5: Test Deployment

### Test Frontend
1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Test chat: `/chat`
3. Test admin: `/admin`

### Test Backend
```bash
curl -X POST "https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/handle-chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"message": "test"}'
```

---

## 📝 Step 6: Update CORS (If Needed)

If you get CORS errors, update Supabase:
1. Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/settings/api
2. Add your Vercel domain to "Allowed Origins"
3. Or use wildcard: `https://*.vercel.app`

---

## 🎯 Quick Deployment Checklist

### Frontend
- [ ] Create Vercel account
- [ ] Import frontend project
- [ ] Set environment variables
- [ ] Deploy
- [ ] Test deployed site

### Backend
- [x] Functions deployed (already done!)
- [x] Secrets configured (already done!)
- [ ] Test API endpoints
- [ ] Verify database connection

### Database
- [x] Migrations applied (already done!)
- [x] 8 therapists loaded (already done!)
- [ ] Test appointment booking

---

## 🌐 After Deployment

### Your Live URLs:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://ljxugwfzkbjlrjwpglnx.supabase.co`
- **Admin Dashboard**: `https://your-app.vercel.app/admin`
- **Chat**: `https://your-app.vercel.app/chat`

### Monitoring:
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx
- **Function Logs**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/logs/edge-functions

---

## ❌ Docker is NOT Needed!

**Why Docker isn't required:**
- ✅ Vercel handles frontend hosting (serverless)
- ✅ Supabase handles backend (Edge Functions are serverless)
- ✅ Database is fully managed by Supabase
- ✅ No containers, no orchestration needed

**When you WOULD need Docker:**
- Self-hosting on your own servers
- Custom backend infrastructure
- Complex microservices architecture

**For this project**: Everything is serverless! No Docker needed! 🎉

---

## 🎉 You're Ready to Deploy!

Everything is configured. Just:
1. Deploy frontend to Vercel
2. Set environment variables
3. Test your live site!

**Backend is already live and working!** ✅

