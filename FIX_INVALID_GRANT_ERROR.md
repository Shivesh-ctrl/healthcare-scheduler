# Fix: "invalid_grant" Error - Token Exchange Failed

## Problem

Getting error: `Token exchange failed: { "error": "invalid_grant", "error_description": "Bad Request" }`

This happens when:
1. **Authorization code already used** (codes are single-use only)
2. **Redirect URI mismatch** (must match exactly)
3. **Code expired** (codes expire quickly, usually within minutes)

---

## ✅ Fix Applied

I've updated the code to:
1. **Ensure exact redirect URI matching** (no trailing slashes)
2. **Better error messages** for invalid_grant errors
3. **Added logging** to help debug issues

**The functions have been redeployed.**

---

## 🔄 Solution: Try Again

The "invalid_grant" error usually means the authorization code was already used or expired. 

### Steps to Fix:

1. **Wait a few seconds** (let any pending requests complete)

2. **Go back to Admin Dashboard**
   - http://localhost:5173/admin

3. **Click "Connect Calendar" again**
   - This will generate a NEW authorization code
   - Complete the OAuth flow fresh

4. **Complete the flow in one go**
   - Don't refresh or go back during the OAuth flow
   - Complete it from start to finish

---

## 🔍 Why This Happens

### Authorization Codes are Single-Use

- Each authorization code can only be used **once**
- If you try to use the same code twice, you get "invalid_grant"
- If the page refreshes or you go back, the code becomes invalid

### Code Expiration

- Authorization codes expire quickly (usually 1-10 minutes)
- If you wait too long, the code becomes invalid

### Redirect URI Must Match Exactly

- The redirect_uri used to exchange the code must match **exactly** what was used to get it
- Even a trailing slash difference causes "invalid_grant"
- I've fixed this to ensure exact matching

---

## ✅ Verification

After the fix, when you connect a calendar:

1. **Click "Connect Calendar"** → Generates new OAuth URL
2. **Complete Google OAuth** → Get authorization code
3. **Frontend receives code** → Calls backend immediately
4. **Backend exchanges code** → Gets tokens
5. **Success!** → Calendar connected

---

## 🆘 If Still Getting Error

### Check These:

1. **Don't refresh during OAuth flow**
   - Complete it in one go
   - Don't go back or refresh

2. **Try a different browser/incognito**
   - Sometimes browser cache causes issues

3. **Check function logs**
   ```bash
   cd backend
   supabase functions logs google-oauth-callback
   ```
   - Look for the redirect_uri being used
   - Should be: `http://localhost:5173/oauth/callback`

4. **Verify Google Console redirect URI**
   - Must be exactly: `http://localhost:5173/oauth/callback`
   - No trailing slash
   - Exact match

5. **Wait and retry**
   - If code was used, wait a minute
   - Try connecting again (generates new code)

---

## 📋 Summary

**Problem:** invalid_grant error (code already used or expired)  
**Fix:** Better error handling + exact redirect URI matching  
**Solution:** Try connecting again (generates fresh code)  

**The code is fixed. Just try connecting the calendar again!** ✅

