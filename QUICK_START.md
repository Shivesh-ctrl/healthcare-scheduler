# 🚀 Quick Start Guide

## 📁 New Structure

Your project is now organized in one folder:

```
Desktop/healthcare-scheduler/
├── backend/          # Supabase Edge Functions
├── frontend/         # React Application
└── README.md         # Project overview
```

---

## 🎯 How to Use

### Start Frontend
```bash
cd ~/Desktop/healthcare-scheduler/frontend
npm run dev
# Opens at: http://localhost:5173
```

### Deploy Backend Changes
```bash
cd ~/Desktop/healthcare-scheduler/backend
supabase functions deploy --project-ref ljxugwfzkbjlrjwpglnx
```

### View Connection Guide
```bash
cat ~/Desktop/healthcare-scheduler/FRONTEND_BACKEND_CONNECTION.md
```

---

## 🔗 How They Connect

**Simple Explanation**:
1. Frontend runs on your computer (port 5173)
2. Backend runs on Supabase cloud
3. Frontend makes HTTP requests to backend
4. Backend processes and returns data

**Configuration**:
- Frontend knows backend URL via `.env` file
- Backend URL: `https://ljxugwfzkbjlrjwpglnx.supabase.co`

**See**: `FRONTEND_BACKEND_CONNECTION.md` for full details

---

## 📊 File Locations

### Frontend Code:
- Components: `frontend/src/components/`
- API Client: `frontend/src/lib/supabase.ts`
- Config: `frontend/.env`

### Backend Code:
- Functions: `backend/supabase/functions/`
- Database: `backend/supabase/migrations/`
- Config: `backend/.env`

---

## ✅ Everything Still Works!

- ✅ Frontend: Same as before
- ✅ Backend: Same as before
- ✅ Just organized better!

**No code changes needed** - everything is the same, just in a better structure!

---

## 🎉 Benefits

1. **One folder** - Everything in one place
2. **Clear separation** - Frontend and backend separate
3. **Easy navigation** - Know where everything is
4. **Better organization** - Professional structure

---

**Ready to use!** 🚀

