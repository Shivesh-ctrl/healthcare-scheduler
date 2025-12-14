# 🔐 Google Calendar OAuth Setup Guide

## Overview

To enable Google Calendar integration (for syncing appointments), you need to:
1. Create OAuth credentials in Google Cloud Console
2. Set the redirect URI
3. Add secrets to Supabase
4. Update frontend environment variables

---

## Step 1: Create Google Cloud Project & OAuth Credentials

### 1.1 Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account
3. Click **"Select a project"** → **"New Project"**
4. Name it: `healthcare-scheduler` (or any name)
5. Click **"Create"**

### 1.2 Enable Google Calendar API

1. Go to: **APIs & Services** → **Library**
2. Search for: **"Google Calendar API"**
3. Click on it and press **"Enable"**

### 1.3 Create OAuth 2.0 Credentials

1. Go to: **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen first:
   - **User Type**: External (or Internal if you have Google Workspace)
   - Click **"Create"**
   - Fill in:
     - **App name**: Healthcare Scheduler
     - **User support email**: Your email
     - **Developer contact**: Your email
   - Click **"Save and Continue"** through the steps
   - Click **"Back to Dashboard"**

4. Now create OAuth Client ID:
   - **Application type**: Web application
   - **Name**: Healthcare Scheduler OAuth
   - **Authorized JavaScript origins** (optional, add if needed):
     ```
     https://gmnqpatcimynhhlehroq.supabase.co
     ```
     ⚠️ **Note**: This should be just the domain, NO path!
   - **Authorized redirect URIs** (REQUIRED):
     ```
     https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/google-callback
     ```
     ⚠️ **Note**: This is the full URL with path!
   - Click **"Create"**

5. **IMPORTANT**: Copy these values immediately:
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `xxxxx` (click "Show" to reveal)

---

## Step 2: Set Secrets in Supabase

Add these secrets to your Supabase project:

### Option A: Via Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/settings/functions
2. Scroll to **"Secrets"** section
3. Add these secrets:

   - **Name**: `GOOGLE_CLIENT_ID`
     - **Value**: Your Client ID from Step 1.3

   - **Name**: `GOOGLE_CLIENT_SECRET`
     - **Value**: Your Client Secret from Step 1.3

   - **Name**: `SITE_URL` (optional, for redirect after OAuth)
     - **Value**: Your Vercel URL (e.g., `https://healthcare-scheduler.vercel.app`)
     - Or leave blank and update later after Vercel deployment

### Option B: Via CLI

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main

# Set Client ID
supabase secrets set GOOGLE_CLIENT_ID=your_client_id_here --project-ref gmnqpatcimynhhlehroq

# Set Client Secret
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret_here --project-ref gmnqpatcimynhhlehroq

# Set Site URL (optional)
supabase secrets set SITE_URL=https://your-vercel-url.vercel.app --project-ref gmnqpatcimynhhlehroq
```

---

## Step 3: Update Frontend Environment

Add the Google Client ID to your frontend `.env` file:

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main/frontend
```

Add this line to `frontend/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

Your complete `frontend/.env` should look like:

```env
VITE_SUPABASE_URL=https://gmnqpatcimynhhlehroq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbnFwYXRjaW15bmhobGVocm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTI2MDcsImV4cCI6MjA4MTI2ODYwN30.QlTf6jhzWyVM2F9IqBlM3jQWq2GM94PDaHraU1Io_A8
VITE_FUNCTIONS_BASE=https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

---

## Step 4: Verify Setup

### Check Supabase Secrets

```bash
supabase secrets list --project-ref gmnqpatcimynhhlehroq
```

You should see:
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `GEMINI_API_KEY` (already set)

### Test OAuth Flow

1. Deploy frontend to Vercel (or run locally: `npm run dev`)
2. Go to Admin page: `/admin`
3. Log in as a therapist
4. Click **"Connect Google Calendar"**
5. Authorize with Google
6. You should be redirected back with success message

---

## 📋 Checklist

- [ ] Google Cloud project created
- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URI added: `https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/google-callback`
- [ ] Client ID and Secret copied
- [ ] `GOOGLE_CLIENT_ID` secret set in Supabase
- [ ] `GOOGLE_CLIENT_SECRET` secret set in Supabase
- [ ] `VITE_GOOGLE_CLIENT_ID` added to `frontend/.env`
- [ ] Tested OAuth flow

---

## 🔧 Important Notes

### Redirect URI Format

The redirect URI **must** exactly match:
```
https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/google-callback
```

### OAuth Flow

1. User clicks "Connect Google Calendar" on Admin page
2. Redirects to Google OAuth
3. User grants permission
4. Google redirects to: `https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/google-callback?code=...&state=therapist_id`
5. Edge function exchanges code for refresh token
6. Saves refresh token to database
7. Redirects to frontend: `https://your-site.com/admin?success=true`

### Security

- ⚠️ Never commit `GOOGLE_CLIENT_SECRET` to git (it's in `.gitignore`)
- ⚠️ Store secrets only in Supabase Dashboard or `.env` files
- ⚠️ Keep your Client Secret secure

---

## 🐛 Troubleshooting

### "Redirect URI mismatch"
- Verify the redirect URI in Google Console exactly matches: `https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/google-callback`
- Check for trailing slashes or typos

### "Invalid client"
- Verify `GOOGLE_CLIENT_ID` is set correctly in Supabase
- Check that the Client ID matches what's in Google Console

### "Invalid client secret"
- Verify `GOOGLE_CLIENT_SECRET` is set correctly in Supabase
- Make sure you copied the secret correctly (no extra spaces)

### OAuth works but appointments don't sync
- Check that the therapist's `google_refresh_token` is saved in the database
- Verify the token hasn't expired
- Check function logs: `supabase functions logs book-appointment`

---

## 📚 Resources

- **Google Cloud Console**: https://console.cloud.google.com/
- **OAuth 2.0 Guide**: https://developers.google.com/identity/protocols/oauth2
- **Supabase Secrets**: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/settings/functions

---

**After completing this setup, your Google Calendar integration will be fully functional!** 🎉

