# Google Calendar OAuth Setup Guide

This guide explains how to set up Google Calendar OAuth integration for the Healthcare Scheduler.

## Overview

The OAuth flow allows therapists to connect their Google Calendar so appointments can be automatically synced when patients book sessions.

## Prerequisites

1. Google Cloud Project with Calendar API enabled
2. OAuth 2.0 credentials (Client ID and Client Secret)
3. Supabase project with Edge Functions deployed

## Step 1: Configure Google Cloud Console

### 1.1 Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Calendar API"
5. Click **Enable**

### 1.2 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application** as the application type
4. Configure the following:

   **Authorized JavaScript origins:**
   - `http://localhost:5173` (for local development)
   - `https://your-production-domain.com` (for production)

   **Authorized redirect URIs:**
   - `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback` (your Supabase function URL)
   - Add your production URL if different

5. Save and note your **Client ID** and **Client Secret**

## Step 2: Set Supabase Secrets

Set the following secrets in your Supabase project:

```bash
cd backend
supabase secrets set GOOGLE_CLIENT_ID="your-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret"
supabase secrets set VITE_FRONTEND_URL="http://localhost:5173"  # or your production URL
```

## Step 3: OAuth Flow

### How It Works

1. **Admin clicks "Connect Calendar"** in the admin dashboard
2. **System generates OAuth URL** via `get-oauth-url` function
3. **User redirected to Google** consent screen
4. **User grants permissions** for calendar access
5. **Google redirects back** to `google-oauth-callback` function
6. **Function exchanges code** for access token and refresh token
7. **Refresh token stored** in database for future use
8. **User redirected back** to admin dashboard with success message

### OAuth Scopes

The application requests the following scopes:
- `https://www.googleapis.com/auth/calendar.events` - Create and manage calendar events
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar information

## Step 4: Using the Feature

### For Admins

1. Log in to the admin dashboard
2. Navigate to the **Therapists & Calendar Integration** section
3. Find the therapist you want to connect
4. Click **"Connect Calendar"** button
5. You'll be redirected to Google's consent screen
6. Sign in and grant permissions
7. You'll be redirected back with a success message

### Calendar Status Indicators

- ✅ **Connected** - Therapist has Google Calendar connected and appointments will sync
- ❌ **Not Connected** - No calendar integration (appointments still work, just no calendar sync)

## Step 5: How Appointments Sync

When a patient books an appointment:

1. Appointment is created in the database
2. If therapist has `google_refresh_token` and `google_calendar_id`:
   - System checks calendar availability
   - Creates event in therapist's Google Calendar
   - Adds patient and therapist as attendees
   - Stores `google_calendar_event_id` in appointment record
3. If calendar not connected, appointment still works (just no calendar sync)

## Troubleshooting

### "OAuth flow failed" Error

- Check that redirect URI in Google Console matches exactly: `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback`
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Check Supabase function logs for detailed error messages

### "No refresh token received"

- Make sure `access_type=offline` is included in OAuth URL (already handled)
- User must grant consent (not just sign in)
- Check that `prompt=consent` is set (already handled)

### Calendar events not creating

- Verify therapist has `google_refresh_token` stored in database
- Check that `google_calendar_id` is set (auto-detected from primary calendar)
- Review function logs for calendar API errors
- Verify refresh token hasn't been revoked

### Testing Locally

1. Set `VITE_FRONTEND_URL` secret to `http://localhost:5173`
2. Make sure your local frontend is running on port 5173
3. Use the OAuth flow - it will redirect back to localhost after completion

## Security Notes

- **Refresh tokens are stored securely** in the database
- **Access tokens are short-lived** and obtained on-demand
- **OAuth credentials** are stored as Supabase secrets (encrypted)
- **HTTPS required** for production redirect URIs

## API Endpoints

### `get-oauth-url` (GET)
Generates Google OAuth consent URL for a therapist.

**Query Parameters:**
- `therapist_id` (required) - ID of therapist to connect

**Response:**
```json
{
  "oauth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### `google-oauth-callback` (GET)
Handles OAuth callback from Google.

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - Therapist ID passed through OAuth flow
- `error` - Error message if OAuth failed

**Response:**
- Redirects to admin dashboard with success/error message

## Database Schema

The `therapists` table includes:
- `google_calendar_id` (TEXT, nullable) - User's primary calendar ID
- `google_refresh_token` (TEXT, nullable) - OAuth refresh token for calendar access

## Next Steps

- Add ability to disconnect/reconnect calendars
- Show calendar sync status in appointment details
- Add calendar event update/delete functionality
- Implement calendar availability checking before booking

