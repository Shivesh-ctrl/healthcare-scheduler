# 🚀 Step-by-Step: Deploy via GitHub + Vercel Dashboard

## 📋 Step 1: Create GitHub Repository

### 1.1 Go to GitHub
👉 **Open**: https://github.com/new

### 1.2 Create Repository
- **Repository name**: `healthcare-scheduler`
- **Description** (optional): `Healthcare Scheduler - AI therapy booking system`
- **Visibility**: 
  - ✅ **Public** (recommended)
  - OR **Private**
- **DO NOT CHECK**:
  - ❌ Add a README file
  - ❌ Add .gitignore
  - ❌ Choose a license

### 1.3 Click "Create repository"

**After creating, GitHub will show setup instructions - we'll use different commands!**

---

## 📤 Step 2: Push Code to GitHub

### 2.1 Get Your GitHub Username
- Check your GitHub profile URL
- Example: `https://github.com/johnsmith` → username is `johnsmith`

### 2.2 Run These Commands

**Replace `YOUR_USERNAME` with your actual GitHub username:**

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/healthcare-scheduler.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 2.3 Authentication
When prompted:
- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (NOT your password)
  - Get token: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Name: `vercel-deploy`
  - Expiration: 90 days (or No expiration)
  - Check: `repo` (all repo permissions)
  - Click "Generate token"
  - **Copy the token immediately** (you won't see it again!)
  - Use this token as your password

### 2.4 Verify
Go to: `https://github.com/YOUR_USERNAME/healthcare-scheduler`
You should see all your files! ✅

---

## 🔗 Step 3: Connect Vercel to GitHub

### 3.1 Go to Vercel
👉 **Open**: https://vercel.com

### 3.2 Sign Up / Login
- Click **"Sign Up"** or **"Login"**
- **Best option**: Click **"Continue with GitHub"**
  - This automatically connects your GitHub account
  - Makes everything easier!

### 3.3 Import Project
1. After login, click **"Add New Project"** (or **"New Project"**)
2. You'll see a list of your GitHub repositories
3. Find **"healthcare-scheduler"** in the list
4. Click **"Import"** button next to it

---

## ⚙️ Step 4: Configure Project in Vercel

### 4.1 Project Settings
- **Project Name**: `healthcare-scheduler-frontend` (or keep default)
- **Framework Preset**: Should auto-detect as **Vite** ✅

### 4.2 Root Directory (IMPORTANT!)
- Look for **"Root Directory"** field
- Click **"Edit"** or the folder icon
- Type: **`frontend`**
- This tells Vercel where your React app is located
- **This is critical!** Without this, Vercel won't find your app

### 4.3 Build Settings (Verify - should auto-detect)
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅
- **Install Command**: `npm install` ✅

### 4.4 Environment Variables (CRITICAL!)

Click on **"Environment Variables"** section (expand it)

**Add Variable 1:**
1. Click **"Add"** or **"Add Another"**
2. **Name**: `VITE_SUPABASE_URL`
3. **Value**: `https://ljxugwfzkbjlrjwpglnx.supabase.co`
4. **Environments**: Check all three:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"** or **"Add"**

**Add Variable 2:**
1. Click **"Add"** or **"Add Another"**
2. **Name**: `VITE_SUPABASE_ANON_KEY`
3. **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4`
4. **Environments**: Check all three:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"** or **"Add"**

### 4.5 Deploy!
Scroll down and click the big **"Deploy"** button!

---

## ⏳ Step 5: Wait for Build

- Vercel will start building your project
- You'll see build logs in real-time
- Takes about 2-3 minutes
- Wait for **"Ready"** status

---

## ✅ Step 6: Your Site is Live!

You'll get a URL like:
- `https://healthcare-scheduler-frontend.vercel.app`
- Or `https://healthcare-scheduler-frontend-xyz123.vercel.app`

**Test your live site:**
- **Home**: `https://your-url.vercel.app`
- **Chat**: `https://your-url.vercel.app/chat`
- **Admin**: `https://your-url.vercel.app/admin`

---

## 🔄 Future Updates

**Automatic!** Every time you push to GitHub:
```bash
git add .
git commit -m "Your update message"
git push
```

Vercel will **automatically redeploy** your site! 🎉

---

## 🆘 Troubleshooting

### "Root Directory not found"
- Make sure you set Root Directory to: **`frontend`** (not `./frontend`)

### "Build failed"
- Check build logs in Vercel dashboard
- Make sure environment variables are set correctly
- Verify Root Directory is `frontend`

### "CORS errors" when testing
- Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/settings/api
- Add your Vercel domain to "Additional Allowed Origins"
- Example: `https://healthcare-scheduler-frontend.vercel.app`

### "Environment variables not working"
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy after adding variables

---

## 📝 Quick Checklist

- [ ] Created GitHub repository
- [ ] Pushed code to GitHub
- [ ] Connected Vercel to GitHub
- [ ] Set Root Directory to `frontend`
- [ ] Added `VITE_SUPABASE_URL` environment variable
- [ ] Added `VITE_SUPABASE_ANON_KEY` environment variable
- [ ] Selected all environments for variables
- [ ] Clicked Deploy
- [ ] Waited for build to complete
- [ ] Tested live site

---

**Ready? Let's start with Step 1!** 🚀

