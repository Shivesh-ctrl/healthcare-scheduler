# 📁 Project Structure - Complete Guide

## 🎯 New Organization

Your Healthcare Scheduler is now organized in **one main folder**:

```
Desktop/
└── healthcare-scheduler/          ← ONE MAIN FOLDER
    ├── backend/                   ← Backend code
    ├── frontend/                  ← Frontend code
    ├── README.md                  ← Main documentation
    ├── package.json               ← Root package file
    ├── FRONTEND_BACKEND_CONNECTION.md  ← How they connect
    └── QUICK_START.md             ← Quick reference
```

---

## 🔗 How Frontend & Backend Connect

### Simple Explanation:

```
┌─────────────┐                    ┌─────────────┐
│  Frontend   │  HTTP Requests →   │   Backend   │
│  (React)    │  ← JSON Responses  │ (Supabase)  │
│  Port 5173  │                    │   (Cloud)    │
└─────────────┘                    └─────────────┘
      │                                    │
      │                                    │
      │ .env file                          │ .env file
      │ VITE_SUPABASE_URL                 │ API Keys
      │ = backend URL                     │ Secrets
```

### Detailed Flow:

1. **User interacts with Frontend** (React app)
2. **Frontend calls API** (`frontend/src/lib/supabase.ts`)
3. **HTTP request sent** to backend URL
4. **Backend processes** (Supabase Edge Function)
5. **Response returned** as JSON
6. **Frontend displays** result to user

### Configuration:

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
GOOGLE_AI_API_KEY=AIzaSy...
```

---

## 📂 Folder Structure

### Backend (`backend/`)
```
backend/
├── supabase/
│   ├── functions/          # Edge Functions (TypeScript)
│   │   ├── handle-chat/    # Chat endpoint
│   │   ├── find-therapist/ # Therapist search
│   │   ├── book-appointment/ # Booking
│   │   ├── get-admin-data/ # Admin dashboard
│   │   └── _shared/        # Shared utilities
│   ├── migrations/         # Database schema
│   └── config.toml         # Supabase config
├── .env                    # Backend secrets
├── package.json
└── README.md
```

### Frontend (`frontend/`)
```
frontend/
├── src/
│   ├── components/         # React components
│   │   ├── ChatInterface.tsx
│   │   ├── TherapistSelection.tsx
│   │   ├── BookingForm.tsx
│   │   └── AdminDashboard.tsx
│   ├── lib/
│   │   ├── supabase.ts     # API client (connects to backend)
│   │   └── types.ts        # TypeScript types
│   ├── App.tsx             # Main app
│   └── main.tsx            # Entry point
├── .env                    # Frontend config
├── package.json
└── README.md
```

---

## 🔌 Connection Points

### 1. API Client (`frontend/src/lib/supabase.ts`)

This file makes all API calls to the backend:

```typescript
// Example: Chat API
export const chatAPI = {
  sendMessage: async (message: string) => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/handle-chat`,  // ← Backend URL
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ message }),
      }
    )
    return response.json()
  }
}
```

### 2. Backend Endpoints (`backend/supabase/functions/`)

Each function handles specific requests:

- `handle-chat/index.ts` - Receives chat messages
- `find-therapist/index.ts` - Searches therapists
- `book-appointment/index.ts` - Creates appointments
- `get-admin-data/index.ts` - Returns admin data

### 3. Environment Variables

**Frontend** needs:
- Backend URL (where to send requests)
- Anon key (for authentication)

**Backend** needs:
- Database connection
- API keys (Google AI, etc.)

---

## 🚀 How to Use

### Start Frontend:
```bash
cd ~/Desktop/healthcare-scheduler/frontend
npm run dev
# Opens: http://localhost:5173
```

### Deploy Backend:
```bash
cd ~/Desktop/healthcare-scheduler/backend
supabase functions deploy --project-ref ljxugwfzkbjlrjwpglnx
```

### View Connection Details:
```bash
cat ~/Desktop/healthcare-scheduler/FRONTEND_BACKEND_CONNECTION.md
```

---

## 📡 API Endpoints

All endpoints are at: `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/handle-chat` | POST | AI chat interface |
| `/find-therapist` | POST | Find matching therapists |
| `/book-appointment` | POST | Book appointment |
| `/get-admin-data` | GET | Admin dashboard data |

---

## 🔄 Data Flow Example

### User sends chat message:

1. **User types** in `ChatInterface.tsx`
2. **Component calls** `chatAPI.sendMessage()`
3. **API client** (`supabase.ts`) makes HTTP POST
4. **Request sent** to `https://.../functions/v1/handle-chat`
5. **Backend function** (`handle-chat/index.ts`) receives it
6. **AI processes** message (Google Gemini)
7. **Database updated** (saves inquiry)
8. **Response returned** as JSON
9. **Frontend receives** response
10. **UI updates** with AI reply

---

## ✅ Benefits of New Structure

1. **One Folder** - Everything organized together
2. **Clear Separation** - Frontend and backend separate
3. **Easy Navigation** - Know where everything is
4. **Professional** - Industry-standard structure
5. **Scalable** - Easy to add more features

---

## 📚 Documentation Files

- **README.md** - Main project overview
- **FRONTEND_BACKEND_CONNECTION.md** - Detailed connection explanation
- **QUICK_START.md** - Quick reference guide
- **PROJECT_STRUCTURE.md** - This file
- **backend/README.md** - Backend documentation
- **frontend/README.md** - Frontend documentation

---

## 🎯 Key Takeaways

1. **Frontend and Backend are separate** but work together
2. **They communicate via HTTP** (REST API)
3. **Backend is in the cloud** (Supabase)
4. **Frontend runs locally** (or can be deployed)
5. **Environment variables connect them**

---

## 🎉 Everything Works!

**No code changes needed!** Everything is the same, just better organized.

- ✅ Frontend still works
- ✅ Backend still works
- ✅ All connections intact
- ✅ Just better structure!

---

**Your project is now professionally organized!** 🚀

