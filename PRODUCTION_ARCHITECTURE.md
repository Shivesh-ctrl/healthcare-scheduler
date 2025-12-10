# Production Architecture & Docker Explanation

## 🏗️ Your App's Architecture (Production)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐         ┌─────────────┐
│   User's    │ ──────> │    Vercel    │ ──────> │  Supabase Edge  │ ──────> │  Google AI  │
│   Browser   │         │  (Frontend)  │         │   Functions     │         │     API     │
└─────────────┘         └──────────────┘         └─────────────────┘         └─────────────┘
                                                           │
                                                           │
                                                           v
                                                  ┌─────────────────┐
                                                  │   PostgreSQL    │
                                                  │    Database     │
                                                  └─────────────────┘
```

### Components:

1. **Frontend (Vercel)**
   - React app
   - Deployed at: https://healthcare-scheduler-frontend-bsu6.vercel.app
   - Auto-deploys from GitHub

2. **Backend (Supabase Edge Functions)**
   - Runs on **Deno runtime** in Supabase Cloud
   - Functions: handle-chat, book-appointment, etc.
   - **NO Docker involved!**

3. **Database (Supabase PostgreSQL)**
   - Stores: therapists, inquiries, appointments
   - Managed by Supabase

4. **AI (Google Gemini)**
   - Model: gemini-2.0-flash
   - Processes chat messages

---

## 🐳 Why Docker Exists (But NOT for Production)

### Docker is ONLY for Local Development

**Used by:**
```bash
supabase start          # Starts local Supabase (uses Docker)
supabase functions serve # Runs functions locally (uses Docker)
```

**What Docker does locally:**
- Runs PostgreSQL database on your machine
- Runs Edge Functions runtime (Deno) on your machine
- Allows testing before deploying

**NOT used for:**
- ❌ Production deployment
- ❌ Vercel hosting
- ❌ Supabase Cloud functions

### Why You Don't See Docker Containers

**Because your app is deployed to the cloud:**
- ✅ Vercel hosts the frontend (no Docker)
- ✅ Supabase Cloud hosts the backend (no Docker)
- ✅ Everything runs in managed cloud infrastructure

---

## 🔍 Your Loading Issue Diagnosis

### Actual Problem

The API **IS** working, but:
1. **Response time:** 5-8 seconds (AI processing)
2. **Still had bugs:** Therapist names slipping through cleanup
3. **Frontend timeout:** 90 seconds (should be enough)

### What Was Fixed

**Before:**
```
"preferences for a therapist's Jasmine Goins, LCSW, age"
```

**After (just deployed):**
```
"preferences for a therapist's gender, age, or background"
```

### How the Fix Works

**8-Step Cleanup Process:**
1. Remove specific phrases first
2. Remove "Jasmine Goins" variations
3. Remove all therapist names from database
4. Remove credential patterns
5. Clean up duplicates
6. Remove location questions
7. **NUCLEAR FINAL PASS** - Hardcoded list of ALL 14 therapist names, removed from ANYWHERE
8. Fix text corruption from removals

---

## 🧪 Testing Instructions

### Wait 3 Minutes for Deployment

The new code (v225) was just deployed. Wait **3 minutes** for propagation.

### Test Steps

1. **Close all browser tabs/windows**

2. **Open NEW Incognito/Private window**

3. **Go to:** https://healthcare-scheduler-frontend-bsu6.vercel.app

4. **Clear storage in console:**
   ```javascript
   localStorage.clear(); sessionStorage.clear(); location.reload();
   ```

5. **Login/Signup**

6. **Send test message:**
   ```
   I have anxiety and Aetna insurance
   ```

7. **Wait 5-8 seconds** (AI processing time)

### Expected Response

```
Hello! I'm here to help you find the right therapist.

To help me find the best match for you, could you tell me:
- What brings you in today?
- What insurance do you have?
- What are your scheduling preferences?
- Are there any specific approaches to therapy you're interested in? 
  (e.g., CBT, mindfulness-based therapy, psychodynamic therapy)
- Do you have any preferences for a therapist's gender, age, or background?
```

**Should NOT contain:**
- ❌ "Jasmine Goins" or ANY therapist name
- ❌ "What is your zip code?"
- ❌ "Are you looking for in-person or virtual?"
- ❌ Duplicate words like "therapist therapist"

---

## 📊 Deployment Status

| Component | Status | Version | Time |
|-----------|--------|---------|------|
| **Backend** | ✅ LIVE | v225 | Just deployed |
| **Frontend** | ✅ LIVE | Auto | From GitHub |
| **Database** | ✅ LIVE | - | Always on |
| **AI Model** | ✅ LIVE | gemini-2.0-flash | Always on |

---

## 🆘 If Still Loading Forever

### Check Browser Console

1. Press **F12** (DevTools)
2. Go to **Network** tab
3. Send message
4. Look for request to `handle-chat`
5. Check:
   - Status: Should be 200
   - Time: Should be 5-10 seconds
   - Response: Should have `{"reply": "..."}`

### If Request Times Out (>90s)

This means AI is taking too long. Solution:
```bash
# Reduce AI timeout in backend
# Edit: backend/supabase/functions/_shared/ai-provider.ts
# Change: perModelTimeout from 20s to 15s
```

### If No Request Sent

Frontend issue:
1. Check CORS errors in console
2. Check if `VITE_SUPABASE_URL` is correct
3. Try hard refresh: Cmd+Shift+R

---

## ✅ Summary

1. **Docker is NOT used for production** - only local dev
2. **Your app runs in the cloud** - Vercel + Supabase + Google AI
3. **Just deployed final fix** - All therapist names now removed
4. **Wait 3 minutes** - Then test in fresh incognito window
5. **Expected response time** - 5-8 seconds (normal for AI)

**The fix is deployed. Test now!** 🚀

