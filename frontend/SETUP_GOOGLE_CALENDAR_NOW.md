# 📅 Google Calendar Setup - Let's Do It Now!

## 🎯 What You'll Get

After this 30-minute setup:
- ✅ Automatic appointment sync to Google Calendar
- ✅ Real-time availability checking
- ✅ Professional calendar invitations
- ✅ Email reminders via Google
- ✅ Conflict prevention

---

## 📋 Step-by-Step Setup

### Step 1: Create Google Cloud Project (5 minutes)

#### 1.1 Open Google Cloud Console
🔗 **Click here**: https://console.cloud.google.com/

#### 1.2 Create Project
1. Click the project dropdown at the top
2. Click **"NEW PROJECT"**
3. Fill in:
   - **Project name**: `Healthcare Scheduler`
   - **Location**: Leave as-is
4. Click **"CREATE"**
5. ⏰ Wait 30 seconds for project creation

#### 1.3 Select Your Project
- Click the project dropdown again
- Select **"Healthcare Scheduler"**

✅ **Checkpoint**: You should see "Healthcare Scheduler" in the top bar

---

### Step 2: Enable Google Calendar API (2 minutes)

#### 2.1 Navigate to APIs
1. Click hamburger menu (☰) in top-left
2. Go to **"APIs & Services"** → **"Library"**

#### 2.2 Enable Calendar API
1. Search for: `Google Calendar API`
2. Click on **"Google Calendar API"**
3. Click the blue **"ENABLE"** button
4. ⏰ Wait 10 seconds

✅ **Checkpoint**: You should see "API Enabled" with a green checkmark

---

### Step 3: Configure OAuth Consent Screen (5 minutes)

#### 3.1 Go to OAuth Consent
1. Click hamburger menu (☰)
2. Go to **"APIs & Services"** → **"OAuth consent screen"**

#### 3.2 Choose User Type
- Select **"External"** (unless you have Google Workspace)
- Click **"CREATE"**

#### 3.3 Fill App Information

**App information**:
```
App name: Healthcare Scheduler
User support email: [YOUR EMAIL]
```

**App domain** (Optional but recommended):
```
Application home page: https://ljxugwfzkbjlrjwpglnx.supabase.co
```

**Developer contact**:
```
Email addresses: [YOUR EMAIL]
```

Click **"SAVE AND CONTINUE"**

#### 3.4 Add Scopes
1. Click **"ADD OR REMOVE SCOPES"**
2. In the filter box, search: `calendar`
3. Check these scopes:
   - ✅ `https://www.googleapis.com/auth/calendar`
   - ✅ `https://www.googleapis.com/auth/calendar.events`
4. Click **"UPDATE"**
5. Click **"SAVE AND CONTINUE"**

#### 3.5 Add Test Users
1. Click **"+ ADD USERS"**
2. Add your email address
3. Add any test therapist emails
4. Click **"ADD"**
5. Click **"SAVE AND CONTINUE"**

#### 3.6 Review
- Review the summary
- Click **"BACK TO DASHBOARD"**

✅ **Checkpoint**: OAuth consent screen configured

---

### Step 4: Create OAuth Credentials (5 minutes)

#### 4.1 Go to Credentials
1. Click hamburger menu (☰)
2. Go to **"APIs & Services"** → **"Credentials"**

#### 4.2 Create Credentials
1. Click **"+ CREATE CREDENTIALS"** at top
2. Select **"OAuth client ID"**

#### 4.3 Configure Application

If prompted to configure consent screen, click **"CONFIGURE CONSENT SCREEN"** and complete Step 3 above.

**Application type**: Select **"Web application"**

**Name**: 
```
Healthcare Scheduler Web
```

**Authorized JavaScript origins**:
Click **"+ ADD URI"** for each:
```
http://localhost:5173
http://localhost:3000
https://ljxugwfzkbjlrjwpglnx.supabase.co
```

**Authorized redirect URIs**:
Click **"+ ADD URI"** for each:
```
http://localhost:5173/auth/callback
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/calendar-callback
```

#### 4.4 Create
Click **"CREATE"**

#### 4.5 Save Your Credentials
A popup will appear with:
- ✅ **Client ID**: `xxxxx-xxxxx.apps.googleusercontent.com`
- ✅ **Client secret**: `GOCSPX-xxxxxxxxxxxxx`

**🚨 IMPORTANT**: Copy both values NOW!

---

### Step 5: Configure Backend (5 minutes)

Open your terminal and run these commands:

#### 5.1 Set Supabase Secrets

**Replace `YOUR_CLIENT_ID` and `YOUR_CLIENT_SECRET` with the values from Step 4.5**

```bash
cd ~/Desktop/healthcare-scheduler-backend

# Set Google Client ID
supabase secrets set GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE" --project-ref ljxugwfzkbjlrjwpglnx

# Set Google Client Secret
supabase secrets set GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE" --project-ref ljxugwfzkbjlrjwpglnx
```

Example:
```bash
supabase secrets set GOOGLE_CLIENT_ID="123456-abcdef.apps.googleusercontent.com" --project-ref ljxugwfzkbjlrjwpglnx
supabase secrets set GOOGLE_CLIENT_SECRET="GOCSPX-abcd1234efgh5678" --project-ref ljxugwfzkbjlrjwpglnx
```

#### 5.2 Verify Secrets
```bash
supabase secrets list --project-ref ljxugwfzkbjlrjwpglnx
```

You should see:
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ GOOGLE_AI_API_KEY (already set)
- ✅ GOOGLE_GENERATIVE_AI_API_KEY (already set)

✅ **Checkpoint**: Secrets configured

---

### Step 6: Update Frontend Environment (2 minutes)

#### 6.1 Edit Frontend .env File

Open in your editor:
```bash
code ~/Desktop/healthcare-scheduler-frontend/.env
```

Or use terminal:
```bash
cd ~/Desktop/healthcare-scheduler-frontend
echo "VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE" >> .env
```

**Replace `YOUR_CLIENT_ID_HERE` with your actual Client ID**

Your `.env` should now have:
```env
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GOOGLE_CLIENT_ID=123456-abcdef.apps.googleusercontent.com
```

#### 6.2 Restart Frontend
```bash
# Stop the dev server (Ctrl+C if running)
# Then restart:
npm run dev
```

✅ **Checkpoint**: Frontend configured

---

### Step 7: Test Calendar Integration (5 minutes)

#### 7.1 Book a Test Appointment
1. Open http://localhost:5173/chat
2. Type: "Hi, I need help with anxiety"
3. Continue conversation and book an appointment
4. Fill in the booking form
5. Click **"Confirm Appointment"**

#### 7.2 Check Backend Logs
Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/logs/edge-functions

Look for book-appointment logs - you should see calendar event creation

#### 7.3 Verify Calendar Event
1. Go to https://calendar.google.com
2. Check the calendar for the therapist's email
3. The appointment should appear! 🎉

✅ **Success!** Calendar integration working!

---

## 🎊 What Now Works

### Automatic Features:
- ✅ **Calendar Sync**: Events auto-created on booking
- ✅ **Availability Check**: Prevents double-booking
- ✅ **Email Invitations**: Google sends to patient
- ✅ **Reminders**: 15-min before by default
- ✅ **Two-way Sync**: Works with existing calendar

### When You Book:
1. Patient fills form
2. Backend checks therapist's Google Calendar for conflicts
3. Creates calendar event if available
4. Saves event ID to database
5. Google sends email invitation to patient
6. Appointment appears in therapist's calendar

---

## 🐛 Troubleshooting

### "The OAuth client was not found"
**Fix**: Double-check Client ID is correct in secrets and .env

### "Access Blocked: This app's request is invalid"
**Fix**: Verify redirect URIs match exactly in Google Cloud Console

### "Calendar event not created"
**Possible causes**:
1. Therapist doesn't have `google_refresh_token` in database yet
2. Need to complete OAuth flow first (one-time per therapist)
3. Check function logs for specific error

### Check Logs
```bash
# Via Dashboard
https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/logs/edge-functions

# Filter by: book-appointment
```

---

## 📊 OAuth Flow (First Time Per Therapist)

### For Admin:
1. In Supabase Dashboard → Table Editor → therapists
2. Add therapist's Google Calendar email to `google_calendar_id`
3. First appointment will trigger OAuth (or set up manually)

### OAuth Process:
1. Therapist authorizes app access
2. Google shows consent screen
3. User approves calendar access
4. Refresh token stored in database
5. Future appointments auto-sync! ✅

---

## ✅ Setup Checklist

Mark each as you complete:

- [ ] Created Google Cloud Project
- [ ] Enabled Calendar API
- [ ] Configured OAuth Consent Screen
- [ ] Created OAuth Credentials
- [ ] Saved Client ID and Secret
- [ ] Set GOOGLE_CLIENT_ID in Supabase
- [ ] Set GOOGLE_CLIENT_SECRET in Supabase
- [ ] Added VITE_GOOGLE_CLIENT_ID to frontend .env
- [ ] Restarted frontend dev server
- [ ] Tested booking appointment
- [ ] Verified calendar event created
- [ ] Checked email invitation sent

---

## 🎯 Quick Reference

### Your Credentials Location:
- Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=healthcare-scheduler
- Supabase Secrets: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/settings/functions
- Frontend .env: `~/Desktop/healthcare-scheduler-frontend/.env`

### Important Links:
- **Google Cloud Console**: https://console.cloud.google.com
- **Calendar API**: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- **OAuth Consent**: https://console.cloud.google.com/apis/credentials/consent
- **Credentials**: https://console.cloud.google.com/apis/credentials
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx

### Commands:
```bash
# View secrets
supabase secrets list --project-ref ljxugwfzkbjlrjwpglnx

# Update secret
supabase secrets set KEY="value" --project-ref ljxugwfzkbjlrjwpglnx

# View logs
https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/logs
```

---

## 💰 Cost

**Google Calendar API**: FREE
- 1,000,000 requests/day
- No credit card required
- No hidden charges

**Total Additional Cost**: $0

---

## 🎉 Success!

Once you complete this setup:
- ✅ Automatic calendar sync
- ✅ Real-time conflict checking  
- ✅ Professional email invitations
- ✅ Google-powered reminders
- ✅ Two-way calendar sync

**Your Healthcare Scheduler will be even more powerful!** 🚀

---

## 📞 Need Help?

### Resources:
- **Full Guide**: `GOOGLE_CALENDAR_SETUP.md`
- **Google Calendar API Docs**: https://developers.google.com/calendar
- **OAuth 2.0 Guide**: https://developers.google.com/identity/protocols/oauth2

### Check:
- Supabase logs for errors
- Browser console for frontend issues
- Google Cloud Console for API status

---

**Ready? Let's do this!** 🎊

Start with Step 1: https://console.cloud.google.com/

