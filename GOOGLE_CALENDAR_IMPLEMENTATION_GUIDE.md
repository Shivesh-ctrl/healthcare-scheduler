# Google Calendar API Implementation - Step-by-Step Guide

This guide walks you through the complete Google Calendar integration implementation.

## ✅ What's Already Implemented

The Google Calendar API integration is **fully implemented** in the codebase:

1. ✅ **Get Access Token** - Using refresh token
2. ✅ **Create Calendar Event** - In therapist's calendar
3. ✅ **Store Event ID** - In appointments table

## 📋 Step-by-Step Setup Instructions

### Step 1: Set Up Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select or create a project

2. **Enable Google Calendar API**
   ```
   Navigation Menu → APIs & Services → Library
   → Search "Google Calendar API"
   → Click "Enable"
   ```

3. **Create OAuth 2.0 Credentials**
   ```
   APIs & Services → Credentials
   → Create Credentials → OAuth client ID
   → Application type: Web application
   ```

4. **Configure OAuth Consent Screen** (if not done)
   ```
   APIs & Services → OAuth consent screen
   → Choose User Type (Internal/External)
   → Fill required fields
   → Add scopes:
     - https://www.googleapis.com/auth/calendar.events
     - https://www.googleapis.com/auth/calendar.readonly
   ```

5. **Set Authorized Redirect URIs**
   ```
   Authorized redirect URIs:
   https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
   
   (Add your production URL if different)
   ```

6. **Save Credentials**
   - Copy **Client ID**
   - Copy **Client Secret**
   - Keep these secure!

---

### Step 2: Configure Supabase Secrets

Open terminal and run:

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler/backend

# Set Google OAuth credentials
supabase secrets set GOOGLE_CLIENT_ID="your-client-id-here"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret-here"

# Set frontend URL (for OAuth redirect)
supabase secrets set VITE_FRONTEND_URL="http://localhost:5173"
# For production, use: supabase secrets set VITE_FRONTEND_URL="https://your-domain.com"
```

**Verify secrets are set:**
```bash
supabase secrets list
```

You should see:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `VITE_FRONTEND_URL`

---

### Step 3: Connect a Therapist's Calendar

1. **Start your frontend** (if not running):
   ```bash
   cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler/frontend
   npm run dev
   ```

2. **Log in to Admin Dashboard**
   - Go to: http://localhost:5173/admin
   - Log in with your admin credentials

3. **Connect Calendar**
   - Scroll to **"Therapists & Calendar Integration"** section
   - Find a therapist
   - Click **"Connect Calendar"** button
   - You'll be redirected to Google
   - Sign in and grant permissions
   - You'll be redirected back with success message

4. **Verify Connection**
   - Check that therapist shows ✅ **"Connected"** status
   - Calendar ID should be stored in database

---

### Step 4: Test Calendar Event Creation

1. **Book an Appointment**
   - Go to chat interface: http://localhost:5173/chat
   - Complete the chat flow
   - Select a therapist with connected calendar
   - Book an appointment

2. **Check Calendar**
   - Go to therapist's Google Calendar
   - You should see the appointment event
   - Event should have:
     - Title: "Therapy Session - [Patient Name]"
     - Patient and therapist as attendees
     - Correct date/time

3. **Verify Database**
   - Check `appointments` table
   - `google_calendar_event_id` should be populated
   - This is the event ID from Google Calendar

---

## 🔍 How It Works (Technical Details)

### Flow Diagram

```
Patient Books Appointment
    ↓
book-appointment Function Called
    ↓
Check: Does therapist have google_refresh_token?
    ↓ YES
Get Access Token (using refresh token)
    ↓
Check Calendar Availability
    ↓
Create Calendar Event
    ↓
Get Event ID from Google
    ↓
Store Event ID in Database
    ↓
Return Success
```

### Code Implementation

#### 1. Get Access Token

**Location:** `backend/supabase/functions/_shared/google-calendar.ts`

```typescript
async getAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: this.clientId,           // From Supabase secret
      client_secret: this.clientSecret,   // From Supabase secret
      refresh_token: refreshToken,        // From database
      grant_type: 'refresh_token',
    }),
  });
  
  const data = await response.json();
  return data.access_token;  // Short-lived token (~1 hour)
}
```

**What happens:**
- Uses stored `refresh_token` from database
- Exchanges it for a new `access_token`
- Access token is valid for ~1 hour
- No user interaction needed

---

#### 2. Create Calendar Event

**Location:** `backend/supabase/functions/_shared/google-calendar.ts`

```typescript
async createEvent(
  calendarId: string,        // therapist.google_calendar_id
  refreshToken: string,      // therapist.google_refresh_token
  event: GoogleCalendarEvent // Event details
): Promise<string> {
  // Step 1: Get access token
  const accessToken = await this.getAccessToken(refreshToken);
  
  // Step 2: Create event via Google Calendar API
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );
  
  // Step 3: Get event ID from response
  const data = await response.json();
  return data.id;  // This is the google_calendar_event_id
}
```

**Event Structure:**
```typescript
{
  summary: "Therapy Session - [Patient Name]",
  description: "Patient details and notes",
  start: {
    dateTime: "2025-01-15T10:00:00Z",
    timeZone: "America/Chicago"
  },
  end: {
    dateTime: "2025-01-15T11:00:00Z",
    timeZone: "America/Chicago"
  },
  attendees: [
    { email: "patient@example.com" },
    { email: "therapist@example.com" }
  ]
}
```

---

#### 3. Store Event ID

**Location:** `backend/supabase/functions/book-appointment/index.ts`

```typescript
// Create appointment with calendar event ID
const { data: appointment } = await supabase
  .from('appointments')
  .insert({
    therapist_id: therapistId,
    patient_name: patientName,
    start_time: startTime,
    end_time: endTime,
    google_calendar_event_id: googleEventId,  // ← Stored here!
    status: 'confirmed'
  });
```

**Database Schema:**
```sql
appointments (
  id UUID,
  therapist_id UUID,
  patient_name TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  google_calendar_event_id TEXT,  -- ← Event ID stored here
  ...
)
```

---

## 🧪 Testing the Implementation

### Test 1: Verify Access Token Generation

```bash
# This happens automatically, but you can test by:
# 1. Booking an appointment with a connected therapist
# 2. Check Supabase function logs for "Access token obtained"
```

### Test 2: Verify Event Creation

1. Book an appointment
2. Check therapist's Google Calendar
3. Verify event appears with correct details
4. Check database: `SELECT google_calendar_event_id FROM appointments WHERE id = '...'`

### Test 3: Verify Event ID Storage

```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  patient_name,
  start_time,
  google_calendar_event_id,
  CASE 
    WHEN google_calendar_event_id IS NOT NULL THEN '✅ Synced'
    ELSE '❌ Not synced'
  END as calendar_status
FROM appointments
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔧 Troubleshooting

### Issue: "Failed to get access token"

**Possible causes:**
- Refresh token expired or revoked
- Wrong `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`
- Therapist needs to reconnect calendar

**Solution:**
1. Check Supabase secrets are correct
2. Have therapist reconnect calendar in admin dashboard
3. Check function logs for detailed error

---

### Issue: "Failed to create calendar event"

**Possible causes:**
- Invalid calendar ID
- Access token expired
- Calendar permissions revoked

**Solution:**
1. Verify `google_calendar_id` in therapists table
2. Check therapist's calendar permissions
3. Try reconnecting calendar

---

### Issue: "Event ID not stored"

**Possible causes:**
- Database insert failed
- Event creation succeeded but ID not captured

**Solution:**
1. Check function logs
2. Verify appointment was created
3. Check if `google_calendar_event_id` field exists in table

---

## 📊 Monitoring & Logs

### View Function Logs

```bash
# In Supabase Dashboard:
# Project → Edge Functions → book-appointment → Logs

# Or via CLI:
supabase functions logs book-appointment
```

### Check Calendar Events

1. Go to therapist's Google Calendar
2. Look for events with title: "Therapy Session - [Name]"
3. Click event to see details

### Database Queries

```sql
-- Check which appointments have calendar sync
SELECT 
  COUNT(*) as total_appointments,
  COUNT(google_calendar_event_id) as synced_appointments,
  COUNT(*) - COUNT(google_calendar_event_id) as unsynced_appointments
FROM appointments;

-- Check therapist calendar connection status
SELECT 
  name,
  email,
  CASE 
    WHEN google_refresh_token IS NOT NULL AND google_calendar_id IS NOT NULL 
    THEN '✅ Connected'
    ELSE '❌ Not Connected'
  END as calendar_status
FROM therapists;
```

---

## ✅ Verification Checklist

- [ ] Google Calendar API enabled in Google Cloud
- [ ] OAuth credentials created and configured
- [ ] Redirect URI added to Google Console
- [ ] Supabase secrets set (CLIENT_ID, CLIENT_SECRET, FRONTEND_URL)
- [ ] At least one therapist has connected calendar
- [ ] Test appointment booked successfully
- [ ] Event appears in therapist's Google Calendar
- [ ] Event ID stored in `appointments.google_calendar_event_id`
- [ ] Function logs show no errors

---

## 🎯 Next Steps

Once verified, you can:

1. **Add Event Updates** - Update calendar events when appointments change
2. **Add Event Deletion** - Delete calendar events when appointments cancelled
3. **Add Reminders** - Set up email/SMS reminders via calendar
4. **Add Recurring Events** - For recurring therapy sessions
5. **Add Calendar Widget** - Show therapist's availability in UI

---

## 📝 Summary

The Google Calendar integration is **fully implemented** and works as follows:

1. **Get Access Token** ✅
   - Uses refresh token from database
   - Calls `https://oauth2.googleapis.com/token`
   - Returns short-lived access token

2. **Create Event** ✅
   - Uses access token for authentication
   - Calls `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`
   - Creates event with patient and therapist as attendees

3. **Store Event ID** ✅
   - Gets event ID from Google API response
   - Stores in `appointments.google_calendar_event_id`
   - Used for future updates/deletions

**Everything is ready to use!** Just follow the setup steps above.

