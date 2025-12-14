# 🧪 Local Testing Guide

## ✅ Prerequisites Check

- ✅ Dependencies installed
- ✅ Frontend `.env` configured
- ✅ Supabase backend deployed
- ✅ All secrets set

---

## 🚀 Start Development Server

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main/frontend
npm run dev
```

The app will start at: **http://localhost:5173**

---

## 🧪 Testing Checklist

### 1. Home Page / Chat Interface

**URL**: http://localhost:5173

**Test:**
- [ ] Page loads without errors
- [ ] Chat interface is visible
- [ ] Can type messages
- [ ] AI responds to messages

**Try these messages:**
- "I'm looking for a therapist"
- "I need help with anxiety"
- "Show me available therapists"

---

### 2. Admin Login

**URL**: http://localhost:5173/admin

**Test:**
- [ ] Login page loads
- [ ] Can request magic link (check email)
- [ ] Can login with password (if user created)
- [ ] After login, dashboard shows

**Note**: Make sure you've created an admin user first (see `ADD_ADMIN_USER.md`)

---

### 3. Admin Dashboard

**After logging in:**

**Test:**
- [ ] Therapist profile visible
- [ ] Inquiries list loads
- [ ] Appointments list loads
- [ ] "Connect Google Calendar" button visible
- [ ] Can see appointment data

---

### 4. Google Calendar Connection

**Test:**
- [ ] Click "Connect Google Calendar"
- [ ] Redirects to Google OAuth
- [ ] Can authorize access
- [ ] Redirects back to admin page
- [ ] Shows "Connected" status

---

### 5. Appointment Booking Flow

**From Chat Interface:**

**Test:**
1. Start conversation: "I want to book an appointment"
2. Provide details when asked:
   - Specialty needed
   - Insurance
   - Preferred time
3. Select a therapist
4. Confirm booking
5. Check:
   - [ ] Appointment appears in admin dashboard
   - [ ] Appointment appears in Google Calendar (if connected)

---

### 6. API Endpoints Test

**Test Backend Functions:**

```bash
# Test handle-chat
curl -X POST https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/handle-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Test find-therapist
curl -X POST https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/find-therapist \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"specialty": "anxiety", "insurance": "Aetna"}'
```

---

## 🐛 Common Issues & Fixes

### "Failed to fetch" or CORS errors

**Fix:**
- Check that Supabase functions are deployed
- Verify `VITE_SUPABASE_URL` in `.env` is correct
- Check browser console for specific errors

### "Unauthorized" errors

**Fix:**
- Verify `VITE_SUPABASE_ANON_KEY` is correct
- Check that the key matches Supabase Dashboard → Settings → API

### Chat not responding

**Fix:**
- Check `GEMINI_API_KEY` is set in Supabase secrets
- View function logs: `supabase functions logs handle-chat`
- Check browser console for errors

### Admin login not working

**Fix:**
- Verify user exists in Supabase Auth
- Check user is linked to therapist record
- Try password login instead of magic link
- Check email confirmation settings

### Google Calendar connection fails

**Fix:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check redirect URI in Google Console matches exactly
- Check `VITE_GOOGLE_CLIENT_ID` in frontend `.env`

---

## 📊 Check Function Logs

```bash
# View all function logs
supabase functions logs handle-chat --project-ref gmnqpatcimynhhlehroq
supabase functions logs book-appointment --project-ref gmnqpatcimynhhlehroq
supabase functions logs get-admin-data --project-ref gmnqpatcimynhhlehroq
```

---

## ✅ Pre-Deployment Checklist

Before deploying to Vercel, verify:

- [ ] Frontend runs locally without errors
- [ ] Chat interface works
- [ ] Admin login works
- [ ] Can view appointments/inquiries
- [ ] Google Calendar connection works (optional)
- [ ] No console errors in browser
- [ ] All environment variables are correct

---

## 🚀 After Local Testing

Once everything works locally:

1. **Commit any changes:**
   ```bash
   git add .
   git commit -m "Local testing complete"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - See `VERCEL_DEPLOY.md` for instructions
   - Don't forget to add environment variables in Vercel!

---

**Happy Testing!** 🎉

