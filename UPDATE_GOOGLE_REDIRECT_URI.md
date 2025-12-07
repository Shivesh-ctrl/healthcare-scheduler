# ✅ Fixed: OAuth 401 Error - Update Required

## 🔧 Solution Implemented

I've fixed the 401 error by changing the OAuth flow:

**Before:** Google → Backend Function (requires auth header) ❌  
**After:** Google → Frontend Route → Backend Function (with auth) ✅

---

## ⚠️ IMPORTANT: Update Google Cloud Console

You **MUST** update the redirect URI in Google Cloud Console:

### Old Redirect URI (Remove this):
```
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
```

### New Redirect URI (Add this):
```
http://localhost:5173/oauth/callback
```

**For production, also add:**
```
https://your-production-domain.com/oauth/callback
```

---

## 📝 Step-by-Step Update

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/
   - Select your project

2. **Navigate to Credentials**
   - **APIs & Services** → **Credentials**
   - Find OAuth Client: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn`

3. **Edit OAuth Client**
   - Click **Edit** (pencil icon)

4. **Update Redirect URIs**
   - **Remove:** `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback`
   - **Add:** `http://localhost:5173/oauth/callback`
   - Click **SAVE**

---

## ✅ How It Works Now

1. **User clicks "Connect Calendar"**
   - Frontend calls `get-oauth-url` function
   - Gets OAuth URL with redirect to frontend

2. **User completes Google OAuth**
   - Google redirects to: `http://localhost:5173/oauth/callback?code=...&state=...`
   - No auth header needed (it's our frontend)

3. **Frontend processes callback**
   - `OAuthCallback` component receives code and state
   - Calls backend function WITH anon key (has proper auth)
   - Backend processes OAuth and stores tokens

4. **Redirect to admin**
   - Frontend redirects to admin dashboard
   - Shows success message

---

## 🧪 Test Again

After updating Google Cloud Console:

1. **Wait 1-2 minutes** for changes to propagate

2. **Go to Admin Dashboard**
   - http://localhost:5173/admin

3. **Click "Connect Calendar"**
   - Should redirect to Google
   - Complete OAuth flow
   - Should redirect back to frontend callback
   - Then redirect to admin with success ✅

---

## 📋 What Changed

### Frontend
- ✅ New route: `/oauth/callback`
- ✅ New component: `OAuthCallback.tsx`
- ✅ Handles OAuth callback and calls backend with auth

### Backend
- ✅ `get-oauth-url` now redirects to frontend
- ✅ `google-oauth-callback` still processes OAuth (called by frontend)

---

## ✅ Verification

After updating Google Cloud Console:

1. OAuth URL should redirect to: `http://localhost:5173/oauth/callback`
2. Google consent screen should work
3. After granting permissions, should redirect to frontend
4. Frontend should process and redirect to admin
5. Calendar should be connected ✅

---

## 🆘 If Still Not Working

1. **Verify redirect URI in Google Console**
   - Must be exactly: `http://localhost:5173/oauth/callback`
   - No trailing slash
   - Correct protocol (http for localhost)

2. **Check browser console**
   - Open DevTools (F12)
   - Look for any errors in Console tab

3. **Check network tab**
   - See if `/oauth/callback` route is being hit
   - Check if backend function is being called

4. **Verify frontend is running**
   - Should be on http://localhost:5173
   - Route `/oauth/callback` should be accessible

---

## 📝 Summary

**Problem:** 401 error because Google's redirect doesn't include auth header  
**Solution:** Redirect to frontend route, which calls backend with auth  
**Action Required:** Update redirect URI in Google Cloud Console  

**Update the redirect URI and try again!** ✅

