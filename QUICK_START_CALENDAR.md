# 🚀 Quick Start: Google Calendar Integration

## ✅ Implementation Status: **COMPLETE**

All three components are fully implemented:
1. ✅ Get Access Token from refresh token
2. ✅ Create Calendar Event in therapist's calendar
3. ✅ Store Event ID in database

---

## 📝 Basic Setup Steps (5 Minutes)

### Step 1: Google Cloud Setup (2 min)

1. Go to: https://console.cloud.google.com/
2. Enable **Google Calendar API**
3. Create **OAuth 2.0 Credentials** (Web application)
4. Add redirect URI:
   ```
   https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
   ```
5. Copy **Client ID** and **Client Secret**

### Step 2: Set Supabase Secrets (1 min)

```bash
cd backend
supabase secrets set GOOGLE_CLIENT_ID="your-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret"
supabase secrets set VITE_FRONTEND_URL="http://localhost:5173"
```

### Step 3: Connect Therapist Calendar (1 min)

1. Go to: http://localhost:5173/admin
2. Log in
3. Click **"Connect Calendar"** for any therapist
4. Complete Google OAuth flow
5. Done! ✅

### Step 4: Test It (1 min)

1. Book an appointment via chat
2. Check therapist's Google Calendar
3. Event should appear! 🎉

---

## 🔍 How It Works

```
Booking Flow:
  ↓
Check therapist has refresh_token?
  ↓ YES
Get Access Token (from Google)
  ↓
Create Calendar Event
  ↓
Get Event ID
  ↓
Store in appointments.google_calendar_event_id
  ↓
Done! ✅
```

---

## 📍 Key Files

- **Get Access Token**: `backend/supabase/functions/_shared/google-calendar.ts` (line 22)
- **Create Event**: `backend/supabase/functions/_shared/google-calendar.ts` (line 45)
- **Store Event ID**: `backend/supabase/functions/book-appointment/index.ts` (line 134)

---

## ✅ Verification

Run this SQL query in Supabase:

```sql
SELECT 
  patient_name,
  start_time,
  google_calendar_event_id,
  CASE 
    WHEN google_calendar_event_id IS NOT NULL 
    THEN '✅ Synced to Calendar'
    ELSE '❌ Not Synced'
  END as status
FROM appointments
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🆘 Quick Troubleshooting

**"Failed to get access token"**
→ Check Supabase secrets are set correctly

**"Event not created"**
→ Therapist needs to reconnect calendar

**"Event ID not stored"**
→ Check function logs in Supabase dashboard

---

**That's it! Everything is implemented and ready to use.** 🎉

