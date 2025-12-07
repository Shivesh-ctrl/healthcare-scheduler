# 📅 Google Calendar Integration Setup Guide

## Overview

This guide will help you enable Google Calendar integration for automatic appointment syncing.

## Current Status

✅ **Backend Code**: Fully implemented and ready
✅ **Types**: Complete type definitions
✅ **API Methods**: createEvent, deleteEvent, checkAvailability
⚠️ **OAuth Setup**: Requires Google Cloud credentials

---

## Prerequisites

- ✅ Google Account
- ✅ Healthcare Scheduler deployed
- ⚠️ Google Cloud Project (we'll create this)

---

## Step 1: Create Google Cloud Project

### 1.1 Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 1.2 Create New Project
1. Click on the project dropdown (top of page)
2. Click **"New Project"**
3. Project Name: `Healthcare Scheduler`
4. Organization: Leave as-is (or select if you have one)
5. Click **"Create"**
6. Wait for project to be created (30 seconds)

---

## Step 2: Enable Google Calendar API

### 2.1 Open APIs & Services
1. In Google Cloud Console, click the hamburger menu (☰)
2. Navigate to **"APIs & Services" → "Library"**

### 2.2 Search and Enable
1. In the search bar, type: `Google Calendar API`
2. Click on **"Google Calendar API"**
3. Click **"Enable"** button
4. Wait for activation (10 seconds)

---

## Step 3: Create OAuth Consent Screen

### 3.1 Configure Consent Screen
1. Go to **"APIs & Services" → "OAuth consent screen"**
2. Select **"External"** (unless you have a Workspace account)
3. Click **"Create"**

### 3.2 Fill in App Information
**Required Fields**:
- App name: `Healthcare Scheduler`
- User support email: Your email
- Developer contact: Your email

**Optional but Recommended**:
- App logo: Upload if you have one
- Application home page: `https://ljxugwfzkbjlrjwpglnx.supabase.co`
- Application privacy policy: Create a simple privacy page
- Application terms of service: Create simple terms

Click **"Save and Continue"**

### 3.3 Add Scopes
1. Click **"Add or Remove Scopes"**
2. Search and add these scopes:
   - `https://www.googleapis.com/auth/calendar` (See and edit events)
   - `https://www.googleapis.com/auth/calendar.events` (View and edit events)
3. Click **"Update"**
4. Click **"Save and Continue"**

### 3.4 Add Test Users (During Development)
1. Click **"Add Users"**
2. Add your email and any test therapist emails
3. Click **"Save and Continue"**
4. Review and click **"Back to Dashboard"**

---

## Step 4: Create OAuth 2.0 Credentials

### 4.1 Go to Credentials
1. Navigate to **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials"**
3. Select **"OAuth client ID"**

### 4.2 Configure OAuth Client
**Application type**: Select **"Web application"**

**Name**: `Healthcare Scheduler Web Client`

**Authorized JavaScript origins**:
```
http://localhost:5173
https://ljxugwfzkbjlrjwpglnx.supabase.co
```

**Authorized redirect URIs**:
```
http://localhost:5173/auth/callback
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/calendar-callback
https://your-production-domain.com/auth/callback
```

Click **"Create"**

### 4.3 Save Your Credentials
You'll see a popup with:
- ✅ **Client ID**: `xxxxx.apps.googleusercontent.com`
- ✅ **Client Secret**: `GOCSPX-xxxxx`

**IMPORTANT**: Copy both values and save them securely!

---

## Step 5: Configure Supabase Secrets

### 5.1 Set Backend Secrets
```bash
cd ~/Desktop/healthcare-scheduler-backend

# Set Google OAuth credentials
supabase secrets set GOOGLE_CLIENT_ID="YOUR_CLIENT_ID" --project-ref ljxugwfzkbjlrjwpglnx
supabase secrets set GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET" --project-ref ljxugwfzkbjlrjwpglnx
```

### 5.2 Update Frontend Environment
Edit `~/Desktop/healthcare-scheduler-frontend/.env`:
```env
# Add this line
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID
```

---

## Step 6: Enable Calendar in Backend

The book-appointment function already has Google Calendar code implemented. It will automatically use it if:
1. ✅ GOOGLE_CLIENT_ID is set
2. ✅ GOOGLE_CLIENT_SECRET is set
3. ✅ Therapist has google_refresh_token in database

---

## Step 7: Test the Integration

### 7.1 Test OAuth Flow
1. Start your frontend: `npm run dev`
2. Go to: http://localhost:5173/chat
3. Book an appointment
4. (OAuth flow will trigger if therapist needs authorization)

### 7.2 Verify Calendar Event
1. Go to https://calendar.google.com
2. Check therapist's calendar
3. Appointment should appear! ✅

---

## How It Works

### User Books Appointment
1. Patient fills booking form
2. Frontend sends request to `book-appointment` function
3. Backend creates appointment in database

### Calendar Integration (Automatic)
4. Backend checks if therapist has `google_refresh_token`
5. If yes:
   - Uses refresh token to get access token
   - Creates calendar event via Google Calendar API
   - Saves `google_calendar_event_id` in appointment
6. If no:
   - Appointment created without calendar sync
   - Admin can manually add events

### OAuth Flow (First Time Only)
1. Therapist needs to authorize once
2. Google shows consent screen
3. App receives refresh token
4. Token stored in `therapists.google_refresh_token`
5. Future appointments auto-sync!

---

## Managing Therapist Calendar Access

### Option 1: Admin Setup (Manual)
1. Go to Supabase Dashboard
2. Navigate to Table Editor → therapists
3. For each therapist:
   - Set `google_calendar_id` to their email
   - Admin completes OAuth flow once per therapist
   - Refresh token stored automatically

### Option 2: Therapist Self-Service (Future Enhancement)
Create a therapist portal where therapists can:
- Connect their own Google Calendar
- Set availability
- View appointments

---

## Troubleshooting

### "Access Blocked: This app's request is invalid"
**Solution**: Make sure redirect URIs match exactly in Google Cloud Console

### "The OAuth client was not found"
**Solution**: Check CLIENT_ID is correct in both Supabase secrets and .env

### "Token has been expired or revoked"
**Solution**: Therapist needs to re-authorize (delete and recreate refresh token)

### Calendar event not created
**Check**:
1. Therapist has google_refresh_token in database
2. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Supabase
3. Check function logs: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/logs

---

## Security Best Practices

### Production Checklist
- [ ] Move app to "Published" status in OAuth consent screen
- [ ] Add your production domain to authorized origins
- [ ] Use HTTPS for all redirect URIs
- [ ] Store refresh tokens securely (already done in Supabase)
- [ ] Implement token rotation
- [ ] Add audit logging for calendar access

### Refresh Token Security
- ✅ Stored encrypted in Supabase database
- ✅ Never exposed to frontend
- ✅ Only accessible by backend functions
- ✅ Can be revoked by user at any time

---

## API Rate Limits

### Google Calendar API Quotas (Free Tier)
- **Queries per day**: 1,000,000
- **Queries per minute**: 10,000
- **Queries per second**: 10

**This is plenty for a healthcare scheduling app!**

For reference:
- 100 appointments/day = 200 API calls/day (well within limits)
- 1000 appointments/day = 2000 API calls/day (still plenty of room)

---

## Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Calendar event created when appointment booked
- [ ] Event details correct (time, date, description)
- [ ] Attendee (patient) added to event
- [ ] Event appears in therapist's calendar
- [ ] Event deleted when appointment cancelled
- [ ] Availability check works correctly
- [ ] Multiple bookings don't conflict

---

## Optional Enhancements

### 1. Availability Checking
Before booking, check therapist's calendar for conflicts:
```typescript
const available = await calendarService.checkAvailability(
  therapist.google_calendar_id,
  therapist.google_refresh_token,
  startTime,
  endTime
)
```

### 2. Email Notifications
Google Calendar automatically sends:
- ✅ Event invitations
- ✅ Reminders (15 min before)
- ✅ Update notifications

### 3. Video Conferencing
Add Google Meet links to appointments:
```typescript
const event = {
  // ... other fields
  conferenceData: {
    createRequest: {
      requestId: uniqueId,
      conferenceSolutionKey: {
        type: 'hangoutsMeet'
      }
    }
  }
}
```

---

## Commands Reference

### Check Secrets
```bash
cd ~/Desktop/healthcare-scheduler-backend
supabase secrets list --project-ref ljxugwfzkbjlrjwpglnx
```

### Update Secrets
```bash
supabase secrets set GOOGLE_CLIENT_ID="new_value" --project-ref ljxugwfzkbjlrjwpglnx
```

### Redeploy Functions
```bash
supabase functions deploy book-appointment --project-ref ljxugwfzkbjlrjwpglnx
```

### View Logs
```bash
# Via Dashboard
https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/logs/edge-functions
```

---

## Cost

### Google Calendar API: **FREE**
- No credit card required for basic usage
- 1M queries/day free
- No hidden charges

### Total Additional Cost: **$0**

---

## Next Steps

1. ✅ Create Google Cloud Project
2. ✅ Enable Calendar API
3. ✅ Create OAuth credentials
4. ✅ Set Supabase secrets
5. ✅ Update frontend .env
6. ✅ Test booking flow
7. ✅ Verify calendar sync

---

## Support Resources

- **Google Calendar API Docs**: https://developers.google.com/calendar
- **OAuth 2.0 Guide**: https://developers.google.com/identity/protocols/oauth2
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Your Project Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx

---

## ✅ Ready to Enable?

Once you have your Google OAuth credentials:

1. Set the secrets (Step 5)
2. Update .env (Step 5.2)
3. Restart frontend
4. Test booking!

The calendar integration will work automatically! 🎉

