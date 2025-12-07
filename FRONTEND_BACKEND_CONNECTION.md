# 🔗 Frontend-Backend Connection Explained

## 📊 Architecture Overview

```
┌─────────────────┐         HTTP/REST API         ┌──────────────────┐
│                 │  ──────────────────────────> │                  │
│   React         │                               │  Supabase Edge   │
│   Frontend      │  <──────────────────────────  │  Functions       │
│   (Port 5173)   │         JSON Responses        │  (Cloud)         │
│                 │                               │                  │
└─────────────────┘                               └──────────────────┘
         │                                                  │
         │                                                  │
         │                                                  ▼
         │                                         ┌──────────────────┐
         │                                         │   PostgreSQL     │
         │                                         │   Database       │
         │                                         │   (Supabase)     │
         │                                         └──────────────────┘
         │
         ▼
┌─────────────────┐
│   Environment   │
│   Variables     │
│   (.env)        │
└─────────────────┘
```

---

## 🔌 How They Connect

### 1. **Environment Variables** (Frontend → Backend URL)

**Location**: `healthcare-scheduler-frontend/.env`

```env
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Purpose**: Tells frontend where the backend is located

---

### 2. **API Client** (Frontend → Backend Calls)

**Location**: `healthcare-scheduler-frontend/src/lib/supabase.ts`

**How it works**:
```typescript
// Frontend makes HTTP requests to backend
const response = await fetch(`${supabaseUrl}/functions/v1/handle-chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
  body: JSON.stringify({ message, inquiryId, conversationHistory }),
})
```

**Endpoints Called**:
- `POST /functions/v1/handle-chat` - Chat with AI
- `POST /functions/v1/find-therapist` - Find matching therapists
- `POST /functions/v1/book-appointment` - Book appointment
- `GET /functions/v1/get-admin-data` - Admin dashboard data

---

### 3. **Backend Edge Functions** (Supabase Cloud)

**Location**: `healthcare-scheduler-backend/supabase/functions/`

**Functions**:
- `handle-chat/` - Processes chat messages
- `find-therapist/` - Matches therapists
- `book-appointment/` - Creates appointments
- `get-admin-data/` - Returns admin data

**Deployed at**: `https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/`

---

### 4. **Database** (Backend → PostgreSQL)

**Location**: Supabase Cloud (PostgreSQL)

**Tables**:
- `therapists` - Therapist data
- `inquiries` - Patient conversations
- `appointments` - Bookings

**Connection**: Backend functions use Supabase client to query database

---

## 🔄 Complete Flow Example

### User sends chat message:

1. **Frontend** (`ChatInterface.tsx`):
   ```typescript
   // User types "I need help with anxiety"
   const response = await chatAPI.sendMessage("I need help with anxiety")
   ```

2. **API Client** (`supabase.ts`):
   ```typescript
   // Makes HTTP POST request
   fetch('https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/handle-chat', {
     method: 'POST',
     body: JSON.stringify({ message: "I need help with anxiety" })
   })
   ```

3. **Backend** (`handle-chat/index.ts`):
   ```typescript
   // Receives request, processes with AI
   const aiResponse = await generateAIResponse(messages, 'google')
   // Saves to database
   await supabase.from('inquiries').insert({...})
   // Returns response
   return { reply: aiResponse, inquiryId: ... }
   ```

4. **Frontend** receives response and displays to user

---

## 🔐 Authentication Flow

### Public Endpoints (Chat, Find, Book):
- Uses `SUPABASE_ANON_KEY` from frontend `.env`
- No user login required
- Works for all visitors

### Admin Endpoints:
- Requires user authentication
- Frontend uses Supabase Auth
- User logs in → gets JWT token
- Token sent in `Authorization` header
- Backend validates token

---

## 📡 API Communication

### Request Format:
```json
POST https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/handle-chat
Headers:
  Content-Type: application/json
  Authorization: Bearer ANON_KEY
Body:
  {
    "message": "user message",
    "inquiryId": "optional-uuid",
    "conversationHistory": [...]
  }
```

### Response Format:
```json
{
  "reply": "AI response text",
  "inquiryId": "uuid",
  "needsMoreInfo": true,
  "matchedTherapists": [...]
}
```

---

## 🗂️ File Structure Connection

```
Frontend (React):
├── src/
│   ├── lib/
│   │   └── supabase.ts          ← Makes API calls to backend
│   ├── components/
│   │   └── ChatInterface.tsx    ← Uses supabase.ts
│   └── App.tsx
└── .env                          ← Backend URL & keys

Backend (Supabase):
├── supabase/
│   └── functions/
│       ├── handle-chat/         ← Receives frontend requests
│       ├── find-therapist/
│       ├── book-appointment/
│       └── get-admin-data/
└── .env                          ← API keys & secrets
```

---

## 🔧 Configuration Files

### Frontend `.env`:
```env
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Backend `.env`:
```env
SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
GOOGLE_AI_API_KEY=AIzaSy...
```

---

## ✅ Summary

**Connection Method**: HTTP REST API calls

**Frontend → Backend**:
- Uses `fetch()` API
- Sends JSON data
- Includes auth token in headers
- Receives JSON responses

**Backend → Database**:
- Uses Supabase client
- Direct database queries
- Row-level security enforced

**Deployment**:
- Frontend: Runs locally (or can deploy to Vercel/Netlify)
- Backend: Deployed on Supabase Edge Functions (cloud)
- Database: Supabase PostgreSQL (cloud)

---

## 🎯 Key Points

1. **Frontend and Backend are separate** - They communicate via HTTP
2. **Backend is in the cloud** - Deployed on Supabase
3. **Frontend runs locally** - Development server on port 5173
4. **Environment variables connect them** - Frontend knows backend URL
5. **API client handles communication** - `supabase.ts` makes all calls

---

**Now let's reorganize them into one folder!** 🚀

