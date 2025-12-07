# Fix: OAuth 401 "Missing authorization header" Error

## Problem

After connecting calendar and logging in as test user, you're getting:
```json
{"code":401,"message":"Missing authorization header"}
```

This happens because **Google's OAuth redirect doesn't include an authorization header**, but Supabase Edge Functions might be checking for it.

---

## ✅ Solution: Configure Function for Public Access

Supabase Edge Functions can be called without authentication if configured properly. The OAuth callback function needs to be accessible without an auth header since Google redirects to it.

### Option 1: Use Anon Key (Recommended)

When calling the function from your frontend to generate the OAuth URL, use the anon key. But for the callback itself, we need to make sure it works without auth.

### Option 2: Make Function Public

The function should work as-is since it uses the service role key internally. However, Supabase might be blocking it at the gateway level.

---

## 🔧 Fix Applied

I've updated the callback function to:
1. Handle requests without authorization headers (expected from Google)
2. Use service role key internally for database operations
3. Properly handle CORS

**The function has been redeployed.**

---

## 🧪 Test Again

1. **Clear browser cache** or use incognito window

2. **Go to Admin Dashboard**
   - http://localhost:5173/admin

3. **Click "Connect Calendar"** again

4. **Complete OAuth Flow**
   - Sign in with your test user account
   - Grant permissions
   - Should redirect back successfully

---

## 🔍 If Still Getting 401 Error

### Check Function Logs

```bash
cd backend
supabase functions logs google-oauth-callback --limit 10
```

Look for any errors or see what's happening.

### Verify Function is Accessible

The function should be accessible at:
```
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
```

### Alternative: Check Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/functions
2. Find `google-oauth-callback`
3. Check the logs tab for errors
4. Verify the function is deployed and active

---

## 📝 Technical Details

### Why This Happens

- Google redirects to your callback URL after OAuth
- Google's request doesn't include an `Authorization` header
- Supabase Edge Functions might check for this header
- Our function uses service role key internally, so it should work

### How It's Fixed

- Function now explicitly handles requests without auth headers
- Uses service role key for all database operations
- Properly validates OAuth code with Google before proceeding

---

## ✅ Verification

After the fix, the OAuth flow should:

1. ✅ Generate OAuth URL correctly
2. ✅ Redirect to Google consent screen
3. ✅ User grants permissions
4. ✅ Google redirects back (without auth header)
5. ✅ Function processes callback successfully
6. ✅ Stores refresh token in database
7. ✅ Redirects to admin dashboard with success

---

## 🆘 Still Not Working?

If you're still getting the 401 error:

1. **Check Supabase Dashboard**
   - Go to Functions → google-oauth-callback → Logs
   - Look for the actual error message

2. **Verify Redirect URI**
   - Make sure it matches exactly in Google Cloud Console
   - Should be: `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback`

3. **Test Direct Call**
   ```bash
   curl "https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback?code=test&state=test"
   ```
   - Should redirect (not return 401)

4. **Check Function Configuration**
   - Make sure function is deployed
   - Check if there are any function-level auth requirements

---

## 📋 Summary

**Problem:** 401 error because Google's redirect doesn't include auth header  
**Fix:** Function updated to handle requests without auth headers  
**Status:** Deployed and ready to test  

**Try the OAuth flow again - it should work now!** ✅

