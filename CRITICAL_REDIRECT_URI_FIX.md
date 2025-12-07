# 🔴 CRITICAL: Redirect URI Mismatch - Exact Fix

## Current Redirect URI

The system is generating this redirect URI:
```
http://localhost:5173/oauth/callback
```

**This EXACT URI must be in Google Cloud Console.**

---

## ⚠️ Step-by-Step Fix (CRITICAL)

### Step 1: Open Google Cloud Console

1. Go to: **https://console.cloud.google.com/**
2. Make sure you're in the **correct project**
3. Project should have Client ID: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn`

### Step 2: Go to Credentials

1. Click: **APIs & Services** (left sidebar)
2. Click: **Credentials**
3. Find your **OAuth 2.0 Client ID**
4. It should show: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn.apps.googleusercontent.com`

### Step 3: Edit OAuth Client

1. Click the **pencil icon** (Edit) next to your OAuth client
2. Scroll down to **"Authorized redirect URIs"** section

### Step 4: Check Current URIs

Look at what's currently in the list. You might see:
- ❌ `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback` (OLD - DELETE THIS)
- ❌ `http://localhost:5173/oauth/callback` (might have trailing slash or typo)

### Step 5: Remove ALL Existing URIs (Temporarily)

1. **Delete ALL redirect URIs** in the list
2. This ensures no conflicts

### Step 6: Add the EXACT URI

1. Click **"+ ADD URI"**
2. **Type this EXACTLY** (copy-paste to avoid typos):
   ```
   http://localhost:5173/oauth/callback
   ```
3. **CRITICAL CHECKS:**
   - ✅ Must be `http://` (NOT `https://`)
   - ✅ Must be `localhost:5173` (NOT `127.0.0.1:5173`)
   - ✅ Must be `/oauth/callback` (exact path)
   - ✅ **NO trailing slash** (not `/oauth/callback/`)
   - ✅ **NO spaces** before or after
   - ✅ **NO extra characters**

### Step 7: Save

1. Click **"SAVE"** button at the bottom
2. **Wait 2-3 minutes** for Google to update (this is important!)

---

## ✅ Verification

After saving, verify:

1. **Check the URI list**
   - Should see ONLY: `http://localhost:5173/oauth/callback`
   - No other URIs
   - No trailing slashes
   - Exact match

2. **Wait 2-3 minutes**
   - Google needs time to propagate changes
   - Don't test immediately

3. **Clear browser cache**
   - Or use incognito/private window
   - This ensures no cached OAuth URLs

---

## 🧪 Test After Update

1. **Wait 2-3 minutes** after saving in Google Console

2. **Clear browser cache** or use incognito window

3. **Go to Admin Dashboard**
   - http://localhost:5173/admin

4. **Click "Connect Calendar"**

5. **Check the OAuth URL** (optional)
   - Open browser DevTools (F12)
   - Go to Network tab
   - Click "Connect Calendar"
   - Look at the request to `get-oauth-url`
   - Check response - `redirect_uri` should be: `http://localhost:5173/oauth/callback`

6. **Complete OAuth Flow**
   - Should redirect to Google without error
   - Grant permissions
   - Should redirect back successfully

---

## 🔍 Common Mistakes

### ❌ Wrong Protocol
- `https://localhost:5173/oauth/callback` ❌ (localhost doesn't use HTTPS)
- `http://localhost:5173/oauth/callback` ✅

### ❌ Wrong Host
- `http://127.0.0.1:5173/oauth/callback` ❌
- `http://localhost:5173/oauth/callback` ✅

### ❌ Trailing Slash
- `http://localhost:5173/oauth/callback/` ❌
- `http://localhost:5173/oauth/callback` ✅

### ❌ Wrong Path
- `http://localhost:5173/oauth` ❌
- `http://localhost:5173/oauth/callback` ✅

### ❌ Extra Spaces
- `http://localhost:5173/oauth/callback ` ❌ (space at end)
- ` http://localhost:5173/oauth/callback` ❌ (space at start)
- `http://localhost:5173/oauth/callback` ✅

---

## 🆘 Still Not Working?

### Check 1: Verify URI in Google Console

1. Go back to Google Cloud Console
2. Edit your OAuth client
3. Check the redirect URI list
4. Should see EXACTLY: `http://localhost:5173/oauth/callback`
5. If not, fix it

### Check 2: Verify What's Being Sent

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Connect Calendar"
4. Find the request to `get-oauth-url`
5. Check the response
6. Decode the `redirect_uri` parameter
7. Should be: `http://localhost:5173/oauth/callback`

### Check 3: Wait Longer

- Google can take 2-5 minutes to update
- Try again after waiting

### Check 4: Use Incognito

- Clear browser cache
- Or use incognito/private window
- This ensures no cached OAuth state

---

## 📋 Quick Checklist

Before testing, verify:

- [ ] Google Cloud Console is open
- [ ] Correct project selected
- [ ] OAuth client found and edited
- [ ] ALL old redirect URIs removed
- [ ] New URI added: `http://localhost:5173/oauth/callback`
- [ ] No trailing slash
- [ ] No extra spaces
- [ ] Exact match (http, localhost, port 5173, /oauth/callback)
- [ ] Changes saved
- [ ] Waited 2-3 minutes
- [ ] Browser cache cleared or incognito used

---

## 🎯 Summary

**Problem:** redirect_uri_mismatch  
**Solution:** Add EXACT URI to Google Cloud Console  
**URI:** `http://localhost:5173/oauth/callback`  
**Action:** Remove all old URIs, add this exact one, save, wait 2-3 minutes  

**Follow the steps above EXACTLY and it will work!** ✅

