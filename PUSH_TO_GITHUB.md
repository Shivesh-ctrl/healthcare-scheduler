# 📤 Push Code to GitHub

## ✅ Repository Connected

Your GitHub repository is ready:
**https://github.com/Shivesh-ctrl/healthcare-scheduler**

---

## 🔐 Authentication Required

GitHub requires authentication to push code. Here's how:

---

## 📋 Method 1: Personal Access Token (Recommended)

### Step 1: Create Personal Access Token

1. **Go to**: https://github.com/settings/tokens
2. **Click**: "Generate new token"
3. **Select**: "Generate new token (classic)"
4. **Fill in**:
   - **Note**: `vercel-deploy`
   - **Expiration**: 90 days (or "No expiration")
   - **Select scopes**: Check **`repo`** (all repo permissions)
5. **Click**: "Generate token"
6. **COPY THE TOKEN** - You won't see it again!

### Step 2: Push Code

Run this command in your terminal:

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler
git push -u origin main
```

**When prompted:**
- **Username**: `Shivesh-ctrl`
- **Password**: Paste your Personal Access Token (NOT your GitHub password)

**Note**: When typing the password, you won't see characters appear - this is normal for security.

---

## 📋 Method 2: GitHub CLI (Alternative)

If you have GitHub CLI installed:

```bash
# Authenticate
gh auth login

# Push code
git push -u origin main
```

---

## ✅ Verify Push

After pushing, check:
👉 https://github.com/Shivesh-ctrl/healthcare-scheduler

You should see all your files!

---

## 🚀 Next Step

After successfully pushing to GitHub, we'll:
1. Connect Vercel to GitHub
2. Configure the project
3. Add environment variables
4. Deploy!

---

## 🆘 Troubleshooting

### "Authentication failed"
- Make sure you're using the Personal Access Token (not password)
- Verify the token has `repo` permissions
- Check token hasn't expired

### "Permission denied"
- Verify you have write access to the repository
- Check the token has correct permissions

### "Repository not found"
- Verify the repository exists at: https://github.com/Shivesh-ctrl/healthcare-scheduler
- Check you're using the correct username

---

**Ready? Get your token and push!** 🚀

