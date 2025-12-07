# 🚀 Step-by-Step: Deploy via GitHub + Vercel

## 📋 Step 1: Create GitHub Repository

### 1.1 Go to GitHub
👉 **Open**: https://github.com/new

### 1.2 Fill in Repository Details
- **Repository name**: `healthcare-scheduler`
- **Description** (optional): `Healthcare Scheduler - AI-powered therapy booking system`
- **Visibility**: 
  - ✅ **Public** (recommended - free, easy sharing)
  - OR **Private** (if you want it private)
- **DO NOT CHECK** any of these:
  - ❌ Add a README file
  - ❌ Add .gitignore
  - ❌ Choose a license

### 1.3 Click "Create repository"

**You'll see a page with setup instructions - DON'T follow those yet!**

---

## 📤 Step 2: Push Your Code to GitHub

### 2.1 Open Terminal
Make sure you're in the project directory.

### 2.2 Run These Commands

**Replace `YOUR_USERNAME` with your actual GitHub username:**

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler

# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/healthcare-scheduler.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Example:**
If your GitHub username is `johnsmith`, the command would be:
```bash
git remote add origin https://github.com/johnsmith/healthcare-scheduler.git
```

### 2.3 Enter GitHub Credentials
- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (not your password)
  - Get token: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Name: `vercel-deploy`
  - Check: `repo` (all repo permissions)
  - Click "Generate token"
  - **Copy the token** (you won't see it again!)
  - Use this token as your password

### 2.4 Verify Upload
Go back to: https://github.com/YOUR_USERNAME/healthcare-scheduler

You should see all your files! ✅

---

## 🔗 Step 3: Connect Vercel to GitHub

### 3.1 Go to Vercel
👉 **Open**: https://vercel.com

### 3.2 Sign Up / Login
- Click **"Sign Up"** or **"Login"**
- **Best option**: Click **"Continue with GitHub"**
  - This automatically connects your GitHub account
  - Makes deployment easier!

### 3.3 Import Project
1. Click **"Add New Project"** (or **"New Project"**)
2. You'll see your GitHub repositories
3. Find **"healthcare-scheduler"**
4. Click **"Import"** button next to it

---

## ⚙️ Step 4: Configure Vercel Project

### 4.1 Project Settings
- **Project Name**: `healthcare-scheduler-frontend` (or keep default)
- **Framework Preset**: **Vite** (should auto-detect)
- **Root Directory**: **`frontend`** ← **IMPORTANT!**
  - Click "Edit" next to Root Directory
  - Type: `frontend`
  - This tells Vercel where your React app is

### 4.2 Build Settings (Auto-detected, verify these)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4.3 Environment Variables
Click **"Environment Variables"** section and add:

**Variable 1:**
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://ljxugwfzkbjlrjwpglnx.supabase.co`
- **Environments**: Check all (Production, Preview, Development)

**Variable 2:**
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4`
- **Environments**: Check all (Production, Preview, Development)

### 4.4 Deploy!
Click the big **"Deploy"** button at the bottom!

---

## ⏳ Step 5: Wait for Deployment

- Vercel will build your project (takes 2-3 minutes)
- You'll see build logs in real-time
- Wait for "Ready" status

---

## ✅ Step 6: Your Site is Live!

You'll get a URL like:
- `https://healthcare-scheduler-frontend.vercel.app`
- Or `https://healthcare-scheduler-frontend-xyz.vercel.app`

**Test it:**
- Home: `https://your-url.vercel.app`
- Chat: `https://your-url.vercel.app/chat`
- Admin: `https://your-url.vercel.app/admin`

---

## 🔄 Future Updates

**Automatic!** Every time you push to GitHub:
```bash
git add .
git commit -m "Update message"
git push
```

Vercel will **automatically redeploy** your site! 🎉

---

## 🆘 Troubleshooting

### "Root Directory not found"
- Make sure you set Root Directory to: `frontend`

### "Build failed"
- Check build logs in Vercel dashboard
- Make sure environment variables are set

### "CORS errors"
- Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/settings/api
- Add your Vercel domain to "Additional Allowed Origins"

---

## 📝 Quick Reference

**GitHub Repo**: https://github.com/YOUR_USERNAME/healthcare-scheduler
**Vercel Dashboard**: https://vercel.com/dashboard
**Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx

---

**Ready? Let's start with Step 1!** 🚀

