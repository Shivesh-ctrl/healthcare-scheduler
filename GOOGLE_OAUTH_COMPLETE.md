# ✅ Google OAuth Setup - COMPLETE!

## ✅ All Credentials Configured

### Supabase Secrets (Backend)
- ✅ `GOOGLE_CLIENT_ID` - Set
- ✅ `GOOGLE_CLIENT_SECRET` - Set
- ✅ `GEMINI_API_KEY` - Set (from earlier)

### Frontend Environment
- ✅ `VITE_GOOGLE_CLIENT_ID` - Added to `frontend/.env`
- ✅ `VITE_SUPABASE_URL` - Configured
- ✅ `VITE_SUPABASE_ANON_KEY` - Configured

---

## 📋 Configuration Summary

**Google OAuth Client ID:**
```
71312501832-538o43jrpardlut926gipdnanft9q4j2.apps.googleusercontent.com
```

**Redirect URI (configured in Google Console):**
```
https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/google-callback
```

---

## ✅ Verification Checklist

- [x] OAuth credentials created in Google Cloud Console
- [x] Redirect URI added to Google Console
- [x] `GOOGLE_CLIENT_ID` set in Supabase
- [x] `GOOGLE_CLIENT_SECRET` set in Supabase
- [x] `VITE_GOOGLE_CLIENT_ID` added to frontend `.env`
- [ ] `SITE_URL` set in Supabase (optional - can set after Vercel deployment)

---

## 🚀 Next Steps

### 1. Set SITE_URL (Optional, but recommended)

After you deploy to Vercel, set the `SITE_URL` secret in Supabase:

```bash
supabase secrets set SITE_URL=https://your-vercel-url.vercel.app --project-ref gmnqpatcimynhhlehroq
```

Or via Dashboard:
- Go to: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/settings/functions
- Add secret: `SITE_URL` = Your Vercel URL

This ensures OAuth redirects go back to your deployed site.

### 2. Deploy to Vercel

Your frontend is now fully configured! Deploy to Vercel:
- See `VERCEL_DEPLOY.md` for instructions
- Don't forget to add `VITE_GOOGLE_CLIENT_ID` to Vercel environment variables!

### 3. Test Google Calendar Integration

After deployment:
1. Go to Admin page: `/admin`
2. Log in as a therapist
3. Click **"Connect Google Calendar"**
4. Authorize with Google
5. You should be redirected back with success message
6. Appointments will now sync to Google Calendar!

---

## 🔧 How It Works

1. **User clicks "Connect Google Calendar"** on admin page
2. **Redirects to Google OAuth** with your Client ID
3. **User grants permission** for calendar access
4. **Google redirects to**: `https://gmnqpatcimynhhlehroq.supabase.co/functions/v1/google-callback?code=...&state=therapist_id`
5. **Edge function** (`google-callback`):
   - Exchanges authorization code for refresh token
   - Saves refresh token to `therapists` table
   - Redirects to your frontend: `https://your-site.com/admin?success=true`
6. **Frontend** detects success and shows confirmation
7. **Future appointments** automatically sync to Google Calendar!

---

## 🎉 Status

**Google Calendar OAuth is fully configured and ready to use!**

All credentials are set, and the integration will work once you:
1. Deploy to Vercel
2. Set `SITE_URL` (optional but recommended)
3. Test the connection from the admin page

---

**Your Healthcare Scheduler now has complete Google Calendar integration!** 📅✨

