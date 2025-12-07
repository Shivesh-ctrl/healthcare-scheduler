# ✅ OAuth Integration Test Results

## Test Status: **ALL PASSED** ✅

### Test Results Summary

- ✅ **get-oauth-url function**: Accessible and working
- ✅ **Database connection**: Successfully fetched therapist (Dr. Sarah Johnson)
- ✅ **OAuth URL generation**: Working correctly
- ✅ **Supabase secrets**: All configured (CLIENT_ID, CLIENT_SECRET, FRONTEND_URL)
- ✅ **Frontend server**: Running on http://localhost:5173

---

## 🧪 Manual Testing Steps

### Step 1: Verify Google Cloud Console Configuration

**CRITICAL:** Before testing, ensure redirect URI is configured:

1. Go to: https://console.cloud.google.com/
2. Navigate to: **APIs & Services** → **Credentials**
3. Find OAuth Client: `518483077410-me17db5mk1ukr3rrhho6n23vpuep47sn`
4. Click **Edit**
5. Verify this redirect URI is added:
   ```
   https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback
   ```
6. If not, add it and **Save**

---

### Step 2: Test OAuth Flow via Admin Dashboard

1. **Open Admin Dashboard**
   ```
   http://localhost:5173/admin
   ```

2. **Log in** with your admin credentials

3. **Navigate to Therapists Section**
   - Scroll to **"Therapists & Calendar Integration"**
   - You should see a list of therapists

4. **Connect Calendar**
   - Find a therapist (e.g., "Dr. Sarah Johnson")
   - Click **"Connect Calendar"** button
   - You should be redirected to Google's OAuth consent screen

5. **Complete OAuth Flow**
   - Sign in with a Google account
   - Review permissions (Calendar access)
   - Click **"Allow"** or **"Continue"**
   - You'll be redirected back to admin dashboard

6. **Verify Success**
   - Check for success notification: ✅ "Google Calendar successfully connected"
   - Therapist status should change to: ✅ **"Connected"**
   - Calendar status indicator should show green checkmark

---

### Step 3: Verify Database Storage

Run this SQL query in Supabase SQL Editor:

```sql
SELECT 
  name,
  email,
  google_calendar_id,
  CASE 
    WHEN google_refresh_token IS NOT NULL THEN '✅ Has Token'
    ELSE '❌ No Token'
  END as token_status,
  CASE 
    WHEN google_calendar_id IS NOT NULL THEN '✅ Has Calendar ID'
    ELSE '❌ No Calendar ID'
  END as calendar_status
FROM therapists
WHERE name = 'Dr. Sarah Johnson';
```

**Expected Result:**
- `google_refresh_token`: Should have a long token string
- `google_calendar_id`: Should have an email address (e.g., `sarah.johnson@example.com`)

---

### Step 4: Test Calendar Event Creation

1. **Book an Appointment**
   - Go to: http://localhost:5173/chat
   - Complete the chat flow
   - Select a therapist with **connected calendar**
   - Fill out booking form
   - Submit appointment

2. **Check Google Calendar**
   - Open the therapist's Google Calendar
   - Look for event: **"Therapy Session - [Patient Name]"**
   - Event should have:
     - Correct date and time
     - Patient email as attendee
     - Therapist email as attendee
     - Description with patient details

3. **Verify Database**
   ```sql
   SELECT 
     patient_name,
     start_time,
     google_calendar_event_id,
     CASE 
       WHEN google_calendar_event_id IS NOT NULL 
       THEN '✅ Synced to Calendar'
       ELSE '❌ Not Synced'
     END as sync_status
   FROM appointments
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Result:**
   - `google_calendar_event_id`: Should have a long event ID string

---

## 🔍 Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Symptom:** Google shows error when redirecting back

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Add exact redirect URI: `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/google-oauth-callback`
4. Make sure it's **exactly** this URL (no trailing slash, correct protocol)
5. Save and try again

---

### Issue: "access_denied" Error

**Symptom:** User sees "access_denied" after OAuth flow

**Solution:**
- User needs to click "Allow" on the consent screen
- Make sure OAuth consent screen is configured in Google Cloud Console
- Check that required scopes are added

---

### Issue: Calendar Not Connecting

**Symptom:** OAuth completes but therapist still shows "Not Connected"

**Check:**
1. Open browser console (F12) for errors
2. Check Supabase function logs:
   ```bash
   supabase functions logs google-oauth-callback
   ```
3. Verify secrets are set:
   ```bash
   supabase secrets list | grep GOOGLE
   ```

---

### Issue: Events Not Creating

**Symptom:** Appointment booked but no calendar event

**Check:**
1. Verify therapist has `google_refresh_token` in database
2. Verify therapist has `google_calendar_id` in database
3. Check function logs:
   ```bash
   supabase functions logs book-appointment
   ```
4. Look for errors like "Failed to get access token" or "Failed to create calendar event"

---

## 📊 Test Checklist

Use this checklist to verify everything works:

- [ ] Google Cloud Console redirect URI configured
- [ ] Admin dashboard accessible
- [ ] Can log in to admin dashboard
- [ ] "Connect Calendar" button visible
- [ ] Clicking button redirects to Google
- [ ] Google OAuth consent screen appears
- [ ] Can grant permissions
- [ ] Redirected back to admin dashboard
- [ ] Success notification appears
- [ ] Therapist shows "Connected" status
- [ ] Database has `google_refresh_token` stored
- [ ] Database has `google_calendar_id` stored
- [ ] Can book appointment with connected therapist
- [ ] Event appears in therapist's Google Calendar
- [ ] Database has `google_calendar_event_id` stored

---

## 🎯 Quick Test Commands

### Test OAuth URL Generation

```bash
curl -X GET "https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/get-oauth-url?therapist_id=f809f2e9-1a0c-47bd-aaf1-28d0f8544c84" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4"
```

### Check Function Logs

```bash
# OAuth callback logs
supabase functions logs google-oauth-callback --limit 10

# Booking logs
supabase functions logs book-appointment --limit 10
```

### Verify Secrets

```bash
supabase secrets list | grep -E "GOOGLE|VITE"
```

---

## ✅ Success Criteria

The integration is working correctly if:

1. ✅ OAuth URL generates without errors
2. ✅ User can complete OAuth flow
3. ✅ Refresh token is stored in database
4. ✅ Calendar ID is stored in database
5. ✅ Therapist shows "Connected" status
6. ✅ Appointments create calendar events
7. ✅ Event IDs are stored in database

---

## 🚀 Next Steps After Testing

Once everything is verified:

1. **Connect all therapists** who need calendar integration
2. **Test with real appointments** to ensure events sync correctly
3. **Monitor function logs** for any errors
4. **Set up production redirect URI** if deploying to production

---

**All automated tests passed! Ready for manual testing.** 🎉

