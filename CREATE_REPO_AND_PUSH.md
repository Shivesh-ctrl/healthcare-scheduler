# 🚀 Create Repository and Push - Step by Step

## Step 1: Create Repository on GitHub

1. **Go to**: https://github.com/new
2. **Repository name**: `healthcare-scheduler`
3. **Description** (optional): `AI-powered healthcare appointment booking system`
4. **Visibility**: Choose Public or Private
5. **IMPORTANT**: 
   - ❌ DO NOT check "Add a README file"
   - ❌ DO NOT check "Add .gitignore"
   - ❌ DO NOT check "Choose a license"
6. Click **"Create repository"**

---

## Step 2: Push Your Code

After creating the repository, run these commands:

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main
git push -u origin main
```

### Authentication Options:

**Option A: Use Personal Access Token** (Recommended)
- When prompted for username: `Shivesh-ctrl`
- When prompted for password: Use a **Personal Access Token**
- Create token at: https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Select scope: `repo` (full control)
- Copy the token and use it as the password

**Option B: Use GitHub CLI** (After authentication)
```bash
gh auth login
# Follow the prompts to authenticate
git push -u origin main
```

---

## Step 3: Verify

After pushing, check:
- https://github.com/Shivesh-ctrl/healthcare-scheduler

You should see all your files there!

---

## Alternative: One Command Push (After creating repo manually)

If you've already created the repo on GitHub, you can push directly:

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main
git push -u origin main
```

