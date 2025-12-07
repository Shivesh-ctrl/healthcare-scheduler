# ✅ Fixed: redirect_uri_mismatch Error

## Problem Identified

The redirect URI was using `http://` instead of `https://`. This has been **fixed and deployed**.

---

## 🔧 What Was Fixed

**Before:**
```
http://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
```

**After:**
```
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
```

---

## ⚠️ CRITICAL: Configure Google Cloud Console

You **MUST** add this exact redirect URI to your Google Cloud Console:

### Step-by-Step Instructions

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Make sure you're in the correct project

2. **Navigate to Credentials**
   - Click: **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn.apps.googleusercontent.com`

3. **Edit OAuth Client**
   - Click the **pencil icon** (Edit) next to your OAuth client

4. **Add Redirect URI**
   - Scroll to **"Authorized redirect URIs"** section
   - Click **"+ ADD URI"**
   - Enter this **EXACT** URI (copy-paste to avoid typos):
     ```
     https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
     ```
   - ⚠️ **IMPORTANT:** 
     - Must be `https://` (not `http://`)
     - No trailing slash
     - Exact path: `/functions/v1/google-oauth-callback`

5. **Save**
   - Click **"SAVE"** at the bottom
   - Wait a few seconds for changes to propagate

---

## ✅ Verify Configuration

After adding the redirect URI, verify it's correct:

1. In Google Cloud Console, check the redirect URI list
2. You should see:
   ```
   https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
   ```
3. Make sure there are no typos or extra characters

---

## 🧪 Test Again

1. **Clear browser cache** (optional but recommended)
   - Or use incognito/private window

2. **Go to Admin Dashboard**
   - http://localhost:5173/admin

3. **Click "Connect Calendar"** again
   - Should now redirect to Google without error

4. **Complete OAuth Flow**
   - Sign in with Google
   - Grant permissions
   - Should redirect back successfully

---

## 🔍 Troubleshooting

### Still Getting "redirect_uri_mismatch"?

**Check these:**

1. **Exact Match Required**
   - Google is very strict - the URI must match **exactly**
   - Check for:
     - ✅ `https://` (not `http://`)
     - ✅ No trailing slash
     - ✅ Correct domain: `ljxugwfzkbjlrjwpglnx.supabase.co`
     - ✅ Correct path: `/functions/v1/google-oauth-callback`

2. **Wait for Propagation**
   - Changes can take 1-2 minutes to propagate
   - Try again after waiting

3. **Check Multiple Redirect URIs**
   - Make sure you didn't add a duplicate with typo
   - Remove any incorrect entries

4. **Verify OAuth Client**
   - Make sure you're editing the correct OAuth client
   - Client ID should match: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn`

### Still Not Working?

1. **Check Function Logs**
   ```bash
   supabase functions logs get-oauth-url --limit 5
   ```

2. **Test OAuth URL Generation**
   ```bash
   curl "https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/get-oauth-url?therapist_id=test" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```
   
   Check the `redirect_uri` parameter in the response - it should be `https://...`

3. **Verify in Google Cloud Console**
   - Double-check the redirect URI is saved
   - Try removing and re-adding it

---

## ✅ Success Checklist

- [ ] Redirect URI added to Google Cloud Console
- [ ] URI uses `https://` (not `http://`)
- [ ] No trailing slash
- [ ] Exact path: `/functions/v1/google-oauth-callback`
- [ ] Changes saved in Google Cloud Console
- [ ] Waited 1-2 minutes for propagation
- [ ] Tried "Connect Calendar" again
- [ ] OAuth flow completes successfully

---

## 📝 Summary

**Fixed:** Redirect URI now uses HTTPS ✅  
**Action Required:** Add redirect URI to Google Cloud Console ⚠️

The code is fixed. You just need to configure Google Cloud Console with the correct redirect URI, and it should work!

