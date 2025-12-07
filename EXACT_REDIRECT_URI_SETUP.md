# 🔴 CRITICAL: Redirect URI Mismatch - Exact Setup Instructions

## Current Redirect URI

The OAuth flow is now configured to redirect to:
```
http://localhost:5173/oauth/callback
```

**You MUST add this EXACT URI to Google Cloud Console.**

---

## 📝 Step-by-Step: Add Redirect URI to Google Cloud Console

### Step 1: Open Google Cloud Console

1. Go to: **https://console.cloud.google.com/**
2. Make sure you're in the **correct project**
3. The project should have Client ID: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn`

### Step 2: Navigate to OAuth Credentials

1. Click on **"APIs & Services"** in the left sidebar
2. Click on **"Credentials"**
3. Find your **OAuth 2.0 Client ID** in the list
4. It should show: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn.apps.googleusercontent.com`

### Step 3: Edit OAuth Client

1. Click the **pencil icon** (Edit) next to your OAuth client
2. Scroll down to **"Authorized redirect URIs"** section

### Step 4: Add the Redirect URI

1. Click **"+ ADD URI"** button
2. **Copy and paste this EXACT URI** (no spaces, no typos):
   ```
   http://localhost:5173/oauth/callback
   ```
3. **IMPORTANT:**
   - Must be `http://` (not `https://`) for localhost
   - Must be `localhost:5173` (not `127.0.0.1`)
   - Must be `/oauth/callback` (exact path)
   - **NO trailing slash**
   - **NO extra spaces**

### Step 5: Remove Old Redirect URI (if present)

If you see this old URI, **DELETE it**:
```
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
```

### Step 6: Save

1. Click **"SAVE"** button at the bottom
2. Wait 1-2 minutes for changes to propagate

---

## ✅ Verification Checklist

After adding the redirect URI, verify:

- [ ] Redirect URI is exactly: `http://localhost:5173/oauth/callback`
- [ ] No trailing slash
- [ ] Uses `http://` (not `https://`) for localhost
- [ ] Uses `localhost:5173` (not IP address)
- [ ] Path is `/oauth/callback` (exact)
- [ ] Old backend redirect URI is removed
- [ ] Changes are saved

---

## 🧪 Test After Update

1. **Wait 1-2 minutes** after saving (for Google to update)

2. **Clear browser cache** or use incognito/private window

3. **Go to Admin Dashboard**
   - http://localhost:5173/admin

4. **Click "Connect Calendar"**

5. **Check the OAuth URL**
   - Before clicking, you can check the browser console
   - The redirect_uri parameter should be: `http://localhost:5173/oauth/callback`

6. **Complete OAuth Flow**
   - Should redirect to Google without error
   - Grant permissions
   - Should redirect back to your frontend

---

## 🔍 Troubleshooting

### Still Getting "redirect_uri_mismatch"?

**Check these:**

1. **Exact Match Required**
   - Google is VERY strict - must match exactly
   - Check for:
     - ✅ `http://` (not `https://` for localhost)
     - ✅ `localhost:5173` (not `127.0.0.1:5173`)
     - ✅ `/oauth/callback` (exact path)
     - ✅ No trailing slash
     - ✅ No extra spaces

2. **Multiple Redirect URIs**
   - Make sure you didn't add a duplicate with a typo
   - Remove any incorrect entries
   - Keep only the correct one for now

3. **Wait for Propagation**
   - Changes can take 1-2 minutes
   - Try again after waiting

4. **Check What's Being Sent**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Click "Connect Calendar"
   - Look at the OAuth URL
   - Check the `redirect_uri` parameter
   - Should match exactly what you added

### Verify Current Redirect URI

To see what redirect URI is being used:

1. Open browser console (F12)
2. Go to Network tab
3. Click "Connect Calendar"
4. Look for the request to `get-oauth-url`
5. Check the response - it contains the OAuth URL
6. Decode the `redirect_uri` parameter
7. Should be: `http://localhost:5173/oauth/callback`

---

## 📋 Quick Reference

**What to add to Google Cloud Console:**
```
http://localhost:5173/oauth/callback
```

**What to remove (if present):**
```
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
```

**Where to add it:**
- Google Cloud Console
- APIs & Services → Credentials
- OAuth 2.0 Client ID → Edit
- Authorized redirect URIs section

---

## 🎯 Summary

**Problem:** Redirect URI mismatch  
**Solution:** Add `http://localhost:5173/oauth/callback` to Google Cloud Console  
**Location:** APIs & Services → Credentials → OAuth Client → Authorized redirect URIs  

**Add the exact URI above and it will work!** ✅

