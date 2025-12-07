# ✅ Deployment Checklist

## 🎯 Quick Checklist

### Backend (Supabase) - ✅ DONE!
- [x] Edge Functions deployed (6 functions active)
- [x] Secrets configured (GOOGLE_AI_API_KEY set)
- [x] Database migrations applied
- [x] 8 therapists loaded
- [x] RLS policies configured

### Frontend (Vercel) - ⏳ TODO
- [ ] Create Vercel account
- [ ] Install Vercel CLI (optional): `npm i -g vercel`
- [ ] Deploy frontend
- [ ] Set environment variables:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Test deployed site
- [ ] Update CORS in Supabase (if needed)

---

## 📋 Environment Variables

### For Vercel Dashboard:
```
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4
```

---

## 🚀 Deployment Commands

### Option 1: Vercel Dashboard (Easiest)
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import frontend folder
4. Add environment variables
5. Deploy!

### Option 2: Vercel CLI
```bash
cd frontend
vercel
# Follow prompts
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

---

## ❌ Docker: NOT NEEDED!

- ✅ Vercel = Serverless frontend hosting
- ✅ Supabase = Serverless backend & database
- ✅ No containers needed!

---

## ✅ After Deployment

Test these URLs:
- Frontend: `https://your-app.vercel.app`
- Chat: `https://your-app.vercel.app/chat`
- Admin: `https://your-app.vercel.app/admin`

