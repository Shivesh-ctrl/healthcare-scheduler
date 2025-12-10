# 🏥 Healthcare Scheduler - Project Overview

## 📖 What Is This Project?

A **smart healthcare scheduling system** that helps people find and book appointments with therapists using an AI-powered chat interface.

---

## 🎯 Main Purpose

**For Patients:**
- Chat with an AI assistant to describe their mental health needs
- Get matched with therapists based on their insurance and preferences
- Book appointments directly through the chat

**For Admins:**
- View all patient inquiries and appointments
- Manage therapist information
- Monitor system activity

---

## 🏗️ How It Works (Simple Explanation)

### 1. **User Flow (Patient Journey)**

```
User visits website
    ↓
Signs up / Logs in
    ↓
Chats with AI: "I'm feeling sad, I have Blue Cross insurance"
    ↓
AI understands: depression, Blue Cross, schedule preferences
    ↓
AI finds matching therapists from database
    ↓
User selects therapist and provides details
    ↓
AI books appointment
    ↓
Appointment saved to database + Google Calendar
```

### 2. **Admin Flow**

```
Admin logs in
    ↓
Views dashboard
    ↓
Sees all inquiries and appointments
    ↓
Can manage therapists and view statistics
```

---

## 🧩 Main Components

### **Frontend (React App)**
- **Landing Page**: Homepage with sign up/login options
- **Chat Interface**: Where patients talk to AI
- **Login/Signup Pages**: User authentication
- **Admin Dashboard**: For admins to view data

**Technology:** React, Vite, Tailwind CSS  
**Deployed on:** Vercel

### **Backend (Supabase)**
- **Database**: Stores therapists, inquiries, appointments, patients
- **Edge Functions**: AI chat handler, booking, admin data
- **Authentication**: User login/signup system

**Technology:** Supabase (PostgreSQL + Deno Edge Functions)  
**Deployed on:** Supabase Cloud

### **AI System (Google Gemini)**
- **Chat Handler**: Processes user messages
- **Smart Extraction**: Understands insurance, schedule, problems
- **Therapist Matching**: Finds best therapists
- **Booking Logic**: Books appointments when all info collected

**Technology:** Google Gemini AI (free tier)

---

## 📊 Database Structure

### **Tables:**

1. **`therapists`** (8 therapists)
   - Name, specialties, insurance accepted
   - Google Calendar connection info

2. **`patients`**
   - User info (email, name, phone)
   - Linked to authentication

3. **`inquiries`**
   - Patient questions/conversations
   - Extracted info (insurance, specialty, schedule)

4. **`appointments`**
   - Booked appointments
   - Links to therapist and patient
   - Date, time, status

---

## 🔄 How Data Flows

### **When User Chats:**

1. User types message → Frontend sends to `handle-chat` function
2. AI processes message → Extracts info (insurance, problem, schedule)
3. AI finds matching therapists → Queries database
4. AI responds to user → Shows therapists or asks for more info
5. When ready → AI books appointment → Saves to database

### **When User Books:**

1. AI collects all info → Therapist, date, time, patient details
2. Calls `book-appointment` function
3. Creates appointment in database
4. Optionally creates Google Calendar event
5. Confirms with user

---

## 🔐 Security & Authentication

- **Users**: Sign up with email/password
- **Admins**: Login to access dashboard
- **Data Protection**: Row Level Security (RLS) in database
- **API Security**: JWT tokens for authentication

---

## 🚀 Key Features

✅ **AI-Powered Chat**
- Understands natural language
- Handles spelling mistakes
- Extracts multiple pieces of info at once
- Empathetic responses

✅ **Smart Therapist Matching**
- Matches by specialty and insurance
- Shows only available therapists
- Sorts by relevance

✅ **Automatic Booking**
- Books appointments directly in chat
- Saves to database
- Creates Google Calendar events

✅ **Admin Dashboard**
- View all inquiries
- See all appointments
- Manage therapists
- Statistics and analytics

---

## 📁 Project Structure

```
healthcare-scheduler/
├── frontend/              # React app
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── lib/          # API clients
│   │   └── App.tsx       # Main app
│   └── package.json
│
├── backend/               # Supabase backend
│   └── supabase/
│       ├── functions/    # Edge Functions
│       └── migrations/   # Database migrations
│
└── README.md
```

---

## 🔧 Technologies Used

**Frontend:**
- React (UI framework)
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (navigation)

**Backend:**
- Supabase (database + auth)
- Deno (Edge Functions runtime)
- PostgreSQL (database)

**AI:**
- Google Gemini (AI model)

**Deployment:**
- Vercel (frontend)
- Supabase (backend)

---

## 🎯 Current Status

✅ **Working Features:**
- User signup/login
- AI chat interface
- Therapist matching
- Appointment booking
- Admin dashboard
- Google Calendar integration
- Email confirmation

✅ **Optimized:**
- Fast AI responses
- Smart information extraction
- Proper error handling
- Production-ready

---

## 📝 Summary

This is a **complete healthcare scheduling system** where:
- **Patients** chat with AI to find and book therapists
- **AI** understands their needs and matches them with therapists
- **System** books appointments and saves to database
- **Admins** can view and manage everything

**Simple Flow:** User chats → AI understands → Finds therapist → Books appointment → Done!

---

## 🔗 Important Links

- **Production URL**: https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx
- **GitHub**: https://github.com/Shivesh-ctrl/healthcare-scheduler

---

## 💡 Key Concepts

1. **AI Chat**: Natural language conversation to understand patient needs
2. **Therapist Matching**: Algorithm finds best therapists based on criteria
3. **Automatic Booking**: System books appointments without manual intervention
4. **Database Storage**: All data saved in Supabase PostgreSQL database
5. **Authentication**: Secure user login/signup system

---

That's the project in a nutshell! 🎉

