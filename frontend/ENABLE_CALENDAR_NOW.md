# 🚀 Enable Google Calendar - Quick Start

## ⏱️ Time Required: 30 minutes

---

## 📋 What You Need

Before starting:
- ✅ Google Account
- ✅ Healthcare Scheduler running (already done!)
- ✅ 30 minutes of time

---

## 🎯 Quick Setup Path

### Option 1: Step-by-Step Guide (Recommended)
📖 **Open**: `SETUP_GOOGLE_CALENDAR_NOW.md`

This guide walks you through:
1. Creating Google Cloud Project (5 min)
2. Enabling Calendar API (2 min)
3. OAuth Consent Screen (5 min)
4. Creating OAuth Credentials (5 min)
5. Configuring Backend (5 min)
6. Testing Integration (5 min)

### Option 2: Quick Script (After Getting Credentials)
Once you have your OAuth credentials:

```bash
cd ~/Desktop/healthcare-scheduler-backend
./configure-calendar.sh
```

This script will:
- ✅ Prompt for your Client ID and Secret
- ✅ Set Supabase secrets automatically
- ✅ Verify configuration
- ✅ Show next steps

---

## 🔗 Start Here

### Step 1: Get OAuth Credentials

**Go to Google Cloud Console**:
🌐 https://console.cloud.google.com

**Follow the guide**:
📖 `SETUP_GOOGLE_CALENDAR_NOW.md`

### Step 2: Configure Backend

**Option A - Use Script**:
```bash
cd ~/Desktop/healthcare-scheduler-backend
./configure-calendar.sh
```

**Option B - Manual**:
```bash
cd ~/Desktop/healthcare-scheduler-backend
supabase secrets set GOOGLE_CLIENT_ID="YOUR_ID" --project-ref ljxugwfzkbjlrjwpglnx
supabase secrets set GOOGLE_CLIENT_SECRET="YOUR_SECRET" --project-ref ljxugwfzkbjlrjwpglnx
```

### Step 3: Update Frontend

```bash
cd ~/Desktop/healthcare-scheduler-frontend
echo 'VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID' >> .env
npm run dev
```

### Step 4: Test It!

1. Open http://localhost:5173/chat
2. Book an appointment
3. Check Google Calendar - event should appear! 🎉

---

## ✅ What You'll Get

After setup:
- ✅ **Automatic Calendar Sync** - Events created on booking
- ✅ **Availability Checking** - Prevents double-booking
- ✅ **Email Invitations** - Professional calendar invites
- ✅ **Reminders** - Google sends automatic reminders
- ✅ **Two-way Sync** - Works with existing calendars

---

## 📚 Available Documentation

### Main Guide (Most Detailed):
📖 **GOOGLE_CALENDAR_SETUP.md** - Complete reference guide

### Quick Setup (Best for Now):
📖 **SETUP_GOOGLE_CALENDAR_NOW.md** - Step-by-step walkthrough

### This File:
📖 **ENABLE_CALENDAR_NOW.md** - Quick reference

---

## 🎯 Quick Decision Guide

### Do I need Google Calendar?

**YES, if you want**:
- ✅ Real-time availability checking
- ✅ Professional email invitations
- ✅ Automatic sync to therapist calendars
- ✅ Google-powered reminders
- ✅ Prevent double-booking

**NO, if**:
- ❌ Manual calendar management is fine
- ❌ Don't need real-time availability
- ❌ Want to get started immediately

**Current state**: App works perfectly without it!

---

## 💰 Cost

**FREE!**
- Google Calendar API: FREE (1M requests/day)
- No credit card required
- No hidden charges

---

## ⏰ Time Breakdown

| Step | Time | Difficulty |
|------|------|-----------|
| Create Google Cloud Project | 5 min | Easy |
| Enable Calendar API | 2 min | Easy |
| OAuth Consent Screen | 5 min | Medium |
| Create OAuth Credentials | 5 min | Medium |
| Configure Backend | 5 min | Easy |
| Update Frontend | 2 min | Easy |
| Test Integration | 5 min | Easy |
| **Total** | **30 min** | **Medium** |

---

## 🚀 Ready to Enable?

### Start Now:
1. Open: https://console.cloud.google.com
2. Follow: `SETUP_GOOGLE_CALENDAR_NOW.md`
3. Run: `./configure-calendar.sh`
4. Test: Book an appointment!

---

## 🐛 Need Help?

### Check These:
- **Setup Guide**: `SETUP_GOOGLE_CALENDAR_NOW.md`
- **Full Docs**: `GOOGLE_CALENDAR_SETUP.md`
- **Supabase Logs**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/logs
- **Google Calendar Docs**: https://developers.google.com/calendar

### Common Issues:
1. **"OAuth client not found"** - Check Client ID matches
2. **"Access Blocked"** - Verify redirect URIs
3. **"No calendar event"** - Check therapist has refresh_token

---

## 📞 Support Resources

- **Google Cloud Console**: https://console.cloud.google.com
- **Calendar API Library**: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- **OAuth Setup**: https://console.cloud.google.com/apis/credentials
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx

---

## ✅ Success Checklist

After completing setup:
- [ ] Created Google Cloud Project
- [ ] Enabled Calendar API  
- [ ] Created OAuth Credentials
- [ ] Set Supabase secrets
- [ ] Updated frontend .env
- [ ] Tested booking
- [ ] Verified calendar event created
- [ ] Confirmed email invitation sent

---

## 🎊 Let's Do This!

**Your healthcare scheduler is about to get even better!**

**Start here**: https://console.cloud.google.com

**Follow this**: `SETUP_GOOGLE_CALENDAR_NOW.md`

**Time needed**: 30 minutes

**Cost**: $0 (FREE!)

---

**Ready? Let's enable Google Calendar integration! 📅🚀**

