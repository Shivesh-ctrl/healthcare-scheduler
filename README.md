# 🏥 Healthcare Scheduler

AI-powered healthcare/therapy appointment booking system with intelligent therapist matching.

## ✨ Features

- **AI-Powered Chat Interface** - Conversational UI with Google Gemini AI
- **Smart Therapist Matching** - Finds therapists based on specialty and insurance
- **Appointment Booking** - Simple booking flow
- **Admin Dashboard** - Secure dashboard for managing appointments
- **Responsive Design** - Works on all devices

## 📁 Project Structure

```
AI_scheduler-main/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── package.json
├── supabase/          # Supabase Edge Functions (Backend)
│   ├── functions/     # Serverless API endpoints
│   └── migrations/    # Database migrations
└── README.md
```

## 🚀 Quick Start

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
See deployment instructions below for Supabase setup.

## 📚 Documentation

- Frontend: `frontend/README.md`
- Backend: See Supabase deployment guide

## 🛠️ Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- Material-UI
- React Router

**Backend:**
- Supabase Edge Functions (Deno)
- PostgreSQL
- Google Gemini AI

## 📝 License

MIT
