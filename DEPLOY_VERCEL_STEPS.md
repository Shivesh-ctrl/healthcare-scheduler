# 🚀 Deploy to Vercel - Step by Step

## Option 1: Deploy via GitHub (Recommended - Easiest)

### Step 1: Create GitHub Repository

1. Go to https://github.com
2. Click **"New repository"** (or the **+** icon)
3. Name it: `healthcare-scheduler`
4. Make it **Public** or **Private** (your choice)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click **"Create repository"**

### Step 2: Push Your Code to GitHub

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/healthcare-scheduler.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Or use GitHub Desktop:**
1. Download GitHub Desktop: https://desktop.github.com
2. File → Add Local Repository
3. Select: `/Users/shiveshsrivastava/Desktop/healthcare-scheduler`
4. Click "Publish repository"
5. Choose name: `healthcare-scheduler`
6. Click "Publish repository"

### Step 3: Deploy to Vercel

1. Go to https://vercel.com
2. Sign up/Login (use GitHub to sign in - easiest!)
3. Click **"Add New Project"**
4. **Import Git Repository**:
   - You'll see your GitHub repositories
   - Click **"Import"** next to `healthcare-scheduler`
5. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` ← **IMPORTANT!**
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
6. **Environment Variables** - Click "Add" and add:
   - **Name**: `VITE_SUPABASE_URL`
     **Value**: `https://ljxugwfzkbjlrjwpglnx.supabase.co`
   - **Name**: `VITE_SUPABASE_ANON_KEY`
     **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4`
7. Click **"Deploy"**
8. Wait 2-3 minutes
9. **Done!** You'll get a URL like `https://healthcare-scheduler.vercel.app`

---

## Option 2: Deploy via Vercel CLI (No GitHub Needed)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler/frontend

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? → Yes
# - Which scope? → (select your account)
# - Link to existing project? → No
# - What's your project's name? → healthcare-scheduler-frontend
# - In which directory is your code located? → ./
# - Want to override the settings? → No
```

### Step 3: Add Environment Variables

```bash
# Add first variable
vercel env add VITE_SUPABASE_URL
# When prompted, paste: https://ljxugwfzkbjlrjwpglnx.supabase.co
# Select: Production, Preview, Development (all three)

# Add second variable
vercel env add VITE_SUPABASE_ANON_KEY
# When prompted, paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4
# Select: Production, Preview, Development (all three)
```

### Step 4: Deploy to Production

```bash
vercel --prod
```

**Done!** You'll get a production URL.

---

## Option 3: Use Vercel CLI with Drag & Drop (Alternative)

If you have Vercel CLI installed:

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler/frontend
vercel --cwd .
```

Then add environment variables via Vercel dashboard after first deployment.

---

## ✅ After Deployment

### Test Your Live Site:
- **Home**: `https://your-app.vercel.app`
- **Chat**: `https://your-app.vercel.app/chat`
- **Admin**: `https://your-app.vercel.app/admin`

### Update CORS (If Needed):
If you get CORS errors:
1. Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/settings/api
2. Add your Vercel domain to "Additional Allowed Origins"
3. Or add: `https://*.vercel.app` (wildcard)

---

## 🎯 Recommended: Option 1 (GitHub + Vercel)

**Why?**
- ✅ Automatic deployments on git push
- ✅ Preview deployments for branches
- ✅ Easy to update
- ✅ Free hosting

**Quick Steps:**
1. Create GitHub repo
2. Push code
3. Connect to Vercel
4. Deploy!

---

## 📝 Need Help?

- **GitHub Setup**: https://docs.github.com/en/get-started
- **Vercel Docs**: https://vercel.com/docs
- **Vercel CLI**: https://vercel.com/docs/cli

