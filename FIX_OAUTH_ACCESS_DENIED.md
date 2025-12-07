# Fix: OAuth Error 403: access_denied

## Problem

You're getting this error because:
- Your OAuth consent screen is in **"Testing"** mode
- Your Google account email is not added to the **test users** list
- Google restricts access to only test users when in testing mode

---

## ✅ Solution: Add Test Users

### Step 1: Go to OAuth Consent Screen

1. **Open Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Consent Screen**
   - Go to: **APIs & Services** → **OAuth consent screen**

3. **Check Publishing Status**
   - You should see: **"Publishing status: Testing"**
   - This is normal for development

### Step 2: Add Test Users

1. **Scroll to "Test users" section**
   - You'll see a section labeled **"Test users"**

2. **Click "+ ADD USERS"**

3. **Add Your Google Account**
   - Enter the email address of the Google account you're using to test
   - For example: `your-email@gmail.com`
   - You can add multiple test users (one per line)

4. **Click "ADD"**

5. **Save Changes**
   - Click **"SAVE AND CONTINUE"** at the bottom

---

## 🔄 Alternative: Use Your Own Google Account

If you're testing with your own Google account (the one that created the OAuth client):

1. **Check if you're the owner**
   - The owner email is usually automatically added
   - But you still need to add it to test users

2. **Add your email to test users** (same steps as above)

---

## 📋 Quick Checklist

- [ ] Go to Google Cloud Console
- [ ] Navigate to: APIs & Services → OAuth consent screen
- [ ] Scroll to "Test users" section
- [ ] Click "+ ADD USERS"
- [ ] Add your Google account email
- [ ] Click "ADD"
- [ ] Save changes
- [ ] Wait 1-2 minutes
- [ ] Try "Connect Calendar" again

---

## 🧪 Test Again

After adding test users:

1. **Wait 1-2 minutes** for changes to propagate

2. **Clear browser cache** (optional)
   - Or use incognito/private window

3. **Go to Admin Dashboard**
   - http://localhost:5173/admin

4. **Click "Connect Calendar"**
   - Should now work with your added test user account

---

## 🔍 Verify Test Users

To check if test users are added:

1. Go to: **APIs & Services** → **OAuth consent screen**
2. Scroll to **"Test users"** section
3. You should see your email listed
4. If not, add it again

---

## ⚠️ Important Notes

### For Development (Current Setup)
- ✅ **Testing mode is fine** for development
- ✅ Just add test users as needed
- ✅ Up to 100 test users allowed

### For Production (Future)
- ⚠️ App needs to be **verified by Google**
- ⚠️ This requires submitting for review
- ⚠️ Can take several days/weeks
- ✅ For now, testing mode works perfectly

---

## 🆘 Still Getting Error?

### Check These:

1. **Email Match**
   - Make sure the email you added matches the one you're signing in with
   - Check for typos

2. **Wait Time**
   - Changes can take 1-2 minutes to propagate
   - Try again after waiting

3. **Multiple Accounts**
   - If you have multiple Google accounts, make sure you're signing in with the one you added

4. **Consent Screen Configuration**
   - Make sure OAuth consent screen is properly configured
   - Required fields should be filled:
     - App name
     - User support email
     - Developer contact email

---

## 📝 Example Test Users List

You might want to add:
- Your personal Gmail account
- Your work Google account (if different)
- Any other accounts you'll use for testing

**Example:**
```
yourname@gmail.com
yourname@company.com
test-account@gmail.com
```

---

## ✅ Success Indicators

After adding test users, you should:

1. ✅ See your email in the test users list
2. ✅ Be able to sign in with that Google account
3. ✅ See the consent screen (not the access denied error)
4. ✅ Successfully grant permissions
5. ✅ Get redirected back to admin dashboard

---

## 🎯 Summary

**Problem:** OAuth consent screen in testing mode, your email not in test users  
**Solution:** Add your Google account email to test users list  
**Time:** 2 minutes  
**Result:** OAuth flow will work! ✅

---

**Quick Fix:**
1. Google Cloud Console → OAuth consent screen
2. Add your email to "Test users"
3. Save
4. Try again!

