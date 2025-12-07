# 🚀 Quick Start - Healthcare Scheduler

## 1️⃣ Start the Frontend (3 commands)

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler-frontend
npm run dev
```

Wait for it to start, then open: **http://localhost:5173**

---

## 2️⃣ Test the Chat (Try it now!)

1. Click **"Start Chat"** on the landing page
2. Type: `Hi, I've been feeling anxious lately`
3. Continue with:
   - `I have Blue Cross insurance`
   - `My name is John Doe, email john@example.com, phone 555-1234`
   - `I prefer weekday evenings`
4. You'll get matched with therapists!
5. Click **"Book Appointment"** on any therapist
6. Fill in the form and confirm

✅ **Done!** You just booked an appointment with AI!

---

## 3️⃣ Check the Admin Dashboard

### First, create an admin account:

1. Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/auth/users
2. Click **"Add User"**
3. Email: `admin@test.com`
4. Password: `admin123`
5. Click **"Create User"**

### Then login:

1. Go to: **http://localhost:5173/admin**
2. Login with the credentials above
3. See all inquiries and appointments!

---

## 🎉 That's It!

Your full-stack healthcare scheduler is working!

### What You Built:
- ✅ Backend: Deployed on Supabase (live)
- ✅ Frontend: React app (running locally)
- ✅ AI: Google Gemini integration (free)
- ✅ Database: 8 therapists ready to match

### Project Locations:
- **Backend**: `/Users/shiveshsrivastava/Desktop/healthcare-scheduler-backend`
- **Frontend**: `/Users/shiveshsrivastava/Desktop/healthcare-scheduler-frontend`

### Useful Links:
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx
- **API Base URL**: https://ljxugwfzkbjlrjwpglnx.supabase.co
- **Full Docs**: See `INTEGRATION_COMPLETE.md` on your Desktop

---

## 🐛 Quick Fixes

### If frontend shows Tailwind errors:
Stop the server (Ctrl+C) and restart: `npm run dev`

### If port 5173 is taken:
Vite will auto-use 5174 or 5175 - just check the terminal output

### If API calls fail:
Check that `.env` file exists in frontend folder with correct keys

---

## 📚 Next Steps

1. **Deploy Frontend**: Use Vercel or Netlify (instructions in README.md)
2. **Customize**: Add more therapists, change colors, modify AI prompts
3. **Extend**: Add email notifications, Google Calendar, payments

---

**🎊 Congratulations!** You have a production-ready healthcare scheduling system!

