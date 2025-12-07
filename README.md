# 🏥 Healthcare Scheduler - Full Stack Application

Complete healthcare scheduling system with AI-powered therapist matching.

## 📁 Project Structure

```
healthcare-scheduler/
├── backend/              # Supabase Edge Functions (TypeScript)
│   ├── supabase/
│   │   ├── functions/    # Edge Functions
│   │   └── migrations/   # Database migrations
│   ├── .env              # Backend config
│   └── README.md
│
├── frontend/             # React Application (TypeScript)
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── lib/          # API client
│   │   └── ...
│   ├── .env              # Frontend config
│   └── README.md
│
└── README.md             # This file
```

---

## 🚀 Quick Start

### Backend (Already Deployed)
```bash
cd backend
# Backend is live at: https://ljxugwfzkbjlrjwpglnx.supabase.co
```

### Frontend (Run Locally)
```bash
cd frontend
npm install
npm run dev
# Opens at: http://localhost:5173
```

---

## 🔗 How Frontend & Backend Connect

**See**: `../FRONTEND_BACKEND_CONNECTION.md` for detailed explanation

**Quick Summary**:
- Frontend makes HTTP requests to backend API
- Backend URL configured in `frontend/.env`
- Backend deployed on Supabase Edge Functions
- Communication via REST API (JSON)

---

## 📡 API Endpoints

All endpoints: `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/`

- `POST /handle-chat` - AI chat interface
- `POST /find-therapist` - Therapist matching
- `POST /book-appointment` - Book appointment
- `GET /get-admin-data` - Admin dashboard

---

## 🛠️ Development

### Backend Commands
```bash
cd backend
supabase functions deploy --project-ref ljxugwfzkbjlrjwpglnx
supabase db push
supabase secrets list --project-ref ljxugwfzkbjlrjwpglnx
```

### Frontend Commands
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## 📚 Documentation

- **Connection Guide**: `../FRONTEND_BACKEND_CONNECTION.md`
- **Backend Docs**: `backend/README.md`
- **Frontend Docs**: `frontend/README.md`
- **API Docs**: `backend/API.md`

---

## 🎯 Features

- ✅ AI-powered chat (Google Gemini)
- ✅ Smart therapist matching
- ✅ Appointment booking
- ✅ Admin dashboard
- ✅ Google Calendar integration (optional)
- ✅ TypeScript throughout
- ✅ Responsive design

---

## 🔐 Configuration

### Frontend `.env`
```env
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Backend `.env`
```env
SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GOOGLE_AI_API_KEY=your_google_key
```

---

## 📊 Tech Stack

**Frontend**:
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router

**Backend**:
- Supabase Edge Functions
- Deno + TypeScript
- PostgreSQL
- Google Gemini AI

---

## 🎉 Status

- ✅ Backend: Deployed and live
- ✅ Frontend: Running locally
- ✅ Database: Configured with 8 therapists
- ✅ AI Integration: Google Gemini working
- ✅ TypeScript: Both frontend and backend

---

## 📞 Support

- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx
- **Frontend**: http://localhost:5173
- **Backend**: https://ljxugwfzkbjlrjwpglnx.supabase.co

---

**Built with ❤️ using React, Supabase, and Google Gemini AI**

