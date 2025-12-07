# ✅ Google OAuth Credentials Configured

## Secrets Successfully Set

Your Google OAuth credentials have been configured in Supabase:

- ✅ `GOOGLE_CLIENT_ID` - Set
- ✅ `GOOGLE_CLIENT_SECRET` - Set  
- ✅ `VITE_FRONTEND_URL` - Set to `http://localhost:5173`

---

## 🔴 IMPORTANT: Configure Google Cloud Console

Before you can use the OAuth flow, you **MUST** add the redirect URI to your Google Cloud Console:

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project (the one with Client ID: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn`)

### Step 2: Configure OAuth Credentials

1. Navigate to: **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn.apps.googleusercontent.com`
3. Click **Edit** (pencil icon)

### Step 3: Add Authorized Redirect URI

In the **Authorized redirect URIs** section, add:

```
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
```

**Also add for local development (optional):**
```
http://localhost:5173/oauth/callback
```

4. Click **Save**

### Step 4: Verify OAuth Consent Screen

1. Go to: **APIs & Services** → **OAuth consent screen**
2. Make sure these scopes are added:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
3. If not, add them and save

---

## ✅ Next Steps: Test the Integration

### 1. Start Your Frontend

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler/frontend
npm run dev
```

### 2. Connect a Therapist's Calendar

1. Go to: http://localhost:5173/admin
2. Log in with admin credentials
3. Scroll to **"Therapists & Calendar Integration"** section
4. Click **"Connect Calendar"** for any therapist
5. You'll be redirected to Google
6. Sign in and grant permissions
7. You'll be redirected back with success message ✅

### 3. Test Appointment Booking

1. Go to: http://localhost:5173/chat
2. Complete the chat flow
3. Select a therapist with connected calendar
4. Book an appointment
5. Check therapist's Google Calendar - event should appear! 🎉

---

## 🔍 Verification Checklist

- [x] Google OAuth credentials set in Supabase
- [ ] Redirect URI added to Google Cloud Console
- [ ] OAuth consent screen scopes configured
- [ ] At least one therapist calendar connected
- [ ] Test appointment booked successfully
- [ ] Event appears in Google Calendar

---

## 🆘 Troubleshooting

### "redirect_uri_mismatch" Error

**Problem:** Redirect URI not configured in Google Console

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Add exact redirect URI: `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback`
4. Save and try again

### "access_denied" Error

**Problem:** User denied permissions

**Solution:**
- User needs to grant calendar permissions
- Make sure OAuth consent screen is configured

### "invalid_client" Error

**Problem:** Client ID or Secret incorrect

**Solution:**
- Verify secrets are set correctly in Supabase
- Check Google Cloud Console for correct credentials

---

## 📝 Quick Test Command

After connecting a calendar, verify it worked:

```sql
-- Run in Supabase SQL Editor
SELECT 
  name,
  email,
  CASE 
    WHEN google_refresh_token IS NOT NULL AND google_calendar_id IS NOT NULL 
    THEN '✅ Connected'
    ELSE '❌ Not Connected'
  END as calendar_status
FROM therapists
LIMIT 10;
```

---

**You're all set! Just configure the redirect URI in Google Cloud Console and you're ready to go!** 🚀

