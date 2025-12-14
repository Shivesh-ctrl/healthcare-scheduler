# 🚀 Deploy to Vercel - Step by Step

## ✅ Prerequisites Completed

- ✅ GitHub repository: https://github.com/Shivesh-ctrl/healthcare-scheduler
- ✅ Supabase backend: Deployed and configured
- ✅ Frontend `.env`: Configured with Supabase credentials
- ✅ GEMINI_API_KEY: Set in Supabase secrets

---

## Step 1: Deploy via Vercel Website (Recommended)

### 1.1 Import Repository

1. Go to: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Sign in with GitHub if needed
4. Select: `healthcare-scheduler` repository
5. Click **"Import"**

### 1.2 Configure Project

**Framework Preset:** Vite (should auto-detect)

**Build Settings:**
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 1.3 Environment Variables

Click **"Environment Variables"** and add:

1. **VITE_SUPABASE_URL**
   - Value: `https://gmnqpatcimynhhlehroq.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbnFwYXRjaW15bmhobGVocm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTI2MDcsImV4cCI6MjA4MTI2ODYwN30.QlTf6jhzWyVM2F9IqBlM3jQWq2GM94PDaHraU1Io_A8`

3. **VITE_FUNCTIONS_BASE** (optional)
   - Value: `https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/`

**Make sure to select:**
- ✅ Production
- ✅ Preview
- ✅ Development

### 1.4 Deploy

Click **"Deploy"** and wait 2-3 minutes!

---

## Step 2: Verify Deployment

After deployment:

1. Visit your Vercel URL (e.g., `https://healthcare-scheduler.vercel.app`)
2. Test the chat interface
3. Try booking an appointment
4. Check admin dashboard

---

## Alternative: Deploy via Vercel CLI

### Install Vercel CLI

```bash
npm install -g vercel
```

### Deploy

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main/frontend

# Deploy
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
# Enter: https://gmnqpatcimynhhlehroq.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbnFwYXRjaW15bmhobGVocm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTI2MDcsImV4cCI6MjA4MTI2ODYwN30.QlTf6jhzWyVM2F9IqBlM3jQWq2GM94PDaHraU1Io_A8

# Deploy to production
vercel --prod
```

---

## 🔧 Troubleshooting

### Build fails
- Check build logs in Vercel dashboard
- Verify environment variables are set correctly
- Check that `frontend/package.json` has correct build scripts

### API calls failing
- Verify environment variables in Vercel
- Check Supabase functions are deployed and active
- Check browser console for errors

### 404 errors
- Verify Root Directory is set to `frontend`
- Check that `dist` folder is generated correctly

---

## ✅ Checklist

- [ ] Repository imported to Vercel
- [ ] Root Directory set to `frontend`
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Deployed successfully
- [ ] Tested all features

---

## 🎉 After Deployment

Your app will be live at: `https://healthcare-scheduler.vercel.app` (or similar)

**Share your deployment URL and start using your Healthcare Scheduler!**

