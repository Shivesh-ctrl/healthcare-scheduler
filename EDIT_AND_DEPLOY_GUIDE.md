# 🛠️ Complete Guide: Editing & Deploying Backend & Frontend

## 📋 Table of Contents

1. [How Backend Works](#how-backend-works)
2. [How to Edit Backend](#how-to-edit-backend)
3. [How to Deploy Backend Changes](#how-to-deploy-backend-changes)
4. [How Frontend Works](#how-frontend-works)
5. [How to Edit Frontend](#how-to-edit-frontend)
6. [How to Deploy Frontend Changes](#how-to-deploy-frontend-changes)
7. [Complete Workflow](#complete-workflow)

---

## 🏗️ How Backend Works

### **Architecture Overview**

Your backend consists of **3 main parts**:

1. **Supabase Database (PostgreSQL)**
   - Stores: therapists, patients, inquiries, appointments
   - Location: Supabase Cloud (managed)
   - Access: Via Supabase Dashboard or SQL queries

2. **Supabase Edge Functions (Deno/TypeScript)**
   - Serverless functions that handle API requests
   - Location: `backend/supabase/functions/`
   - Runtime: Deno (TypeScript runtime)
   - Deployed to: Supabase Cloud

3. **Supabase Secrets (Environment Variables)**
   - API keys, credentials
   - Location: Supabase Dashboard → Settings → Secrets
   - Used by: Edge Functions

---

### **Backend Structure**

```
backend/
├── supabase/
│   ├── functions/              # Edge Functions (API endpoints)
│   │   ├── handle-chat/       # AI chat handler
│   │   ├── book-appointment/  # Booking logic
│   │   ├── find-therapist/    # Therapist matching
│   │   ├── get-admin-data/    # Admin dashboard data
│   │   └── _shared/           # Shared code (AI, database client)
│   │
│   └── migrations/            # Database schema changes
│       ├── 00001_initial_schema.sql
│       ├── 00002_row_level_security.sql
│       └── 00003_create_patients_table.sql
│
└── .env                       # Local environment variables
```

---

### **How Backend Functions Work**

#### **1. Edge Functions (API Endpoints)**

Each function is a **serverless endpoint** that:
- Receives HTTP requests (POST/GET)
- Processes the request
- Returns JSON response

**Example: `handle-chat` function**

```typescript
// backend/supabase/functions/handle-chat/index.ts

serve(async (req: Request) => {
  // 1. Parse request
  const { message } = await req.json()
  
  // 2. Connect to database
  const supabase = createSupabaseClient()
  
  // 3. Call AI
  const aiResponse = await generateAIResponse(message)
  
  // 4. Save to database
  await supabase.from('inquiries').insert({...})
  
  // 5. Return response
  return new Response(JSON.stringify({ reply: aiResponse }))
})
```

**Available Functions:**
- `handle-chat` - AI chat interface
- `book-appointment` - Book appointments
- `find-therapist` - Find matching therapists
- `get-admin-data` - Admin dashboard data
- `get-oauth-url` - Google Calendar OAuth
- `google-oauth-callback` - OAuth callback handler

**Function URLs:**
```
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/handle-chat
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/book-appointment
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/find-therapist
https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/get-admin-data
```

---

#### **2. Database (PostgreSQL)**

**Tables:**
- `therapists` - Therapist information
- `patients` - User/patient data
- `inquiries` - Chat conversations
- `appointments` - Booked appointments

**Access:**
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/editor
- **SQL Editor**: Run queries directly
- **Table Editor**: View/edit data visually

---

#### **3. Shared Code (`_shared/` folder)**

Reusable code used by multiple functions:
- `ai-provider.ts` - AI model integration (Gemini)
- `supabase-client.ts` - Database client
- `cors.ts` - CORS handling
- `types.ts` - TypeScript types
- `google-calendar.ts` - Google Calendar integration

---

## ✏️ How to Edit Backend

### **Step 1: Open the File**

**For Edge Functions:**
```bash
# Navigate to backend
cd backend

# Edit a function
code supabase/functions/handle-chat/index.ts
# or
nano supabase/functions/handle-chat/index.ts
```

**For Database Schema:**
```bash
# Edit migrations
code supabase/migrations/00001_initial_schema.sql
```

---

### **Step 2: Make Your Changes**

**Example: Change AI Response Behavior**

```typescript
// backend/supabase/functions/handle-chat/index.ts

// BEFORE:
const aiResponse = await generateAIResponse(message)

// AFTER: Add custom logic
const aiResponse = await generateAIResponse(message)
const customResponse = `[Custom Prefix] ${aiResponse}`
```

**Example: Add New Database Query**

```typescript
// backend/supabase/functions/handle-chat/index.ts

// Add this inside the function:
const { data: customData } = await supabase
  .from('therapists')
  .select('*')
  .eq('specialty', 'depression')
```

---

### **Step 3: Test Locally (Optional)**

```bash
# Start Supabase locally
cd backend
supabase start

# Serve functions locally
supabase functions serve

# Test in another terminal
curl http://localhost:54321/functions/v1/handle-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"message": "test"}'
```

---

## 🚀 How to Deploy Backend Changes

### **Method 1: Deploy Single Function (Recommended)**

```bash
# Navigate to backend
cd backend

# Deploy specific function
supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx

# Or deploy all functions
supabase functions deploy --project-ref ljxugwfzkbjlrjwpglnx
```

**What happens:**
1. Code is uploaded to Supabase
2. Function is compiled
3. New version is deployed
4. Old version is replaced
5. Changes are **LIVE immediately** ✅

---

### **Method 2: Deploy via Supabase Dashboard**

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/functions

2. **Edit Function** (if supported)
   - Some functions can be edited directly in dashboard

3. **Or use CLI** (recommended)
   - Use Method 1 above

---

### **Deploy Database Changes**

**If you modified migrations:**

```bash
cd backend

# Push database changes
supabase db push --project-ref ljxugwfzkbjlrjwpglnx

# Or create new migration
supabase migration new add_new_column

# Then push
supabase db push --project-ref ljxugwfzkbjlrjwpglnx
```

---

### **Update Secrets (API Keys)**

```bash
cd backend

# Set new secret
supabase secrets set GOOGLE_AI_API_KEY="new_key_here" --project-ref ljxugwfzkbjlrjwpglnx

# List all secrets
supabase secrets list --project-ref ljxugwfzkbjlrjwpglnx
```

**Or via Dashboard:**
- https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/settings/secrets

---

## 🎨 How Frontend Works

### **Architecture Overview**

Your frontend is a **React application** that:
- Runs in the user's browser
- Makes API calls to backend
- Displays UI to users

---

### **Frontend Structure**

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ChatInterface.tsx
│   │   ├── SignUp.tsx
│   │   ├── UserLogin.tsx
│   │   └── AdminDashboard.tsx
│   │
│   ├── lib/                 # API clients & utilities
│   │   ├── supabase.ts      # API calls to backend
│   │   └── types.ts         # TypeScript types
│   │
│   └── App.tsx              # Main app component
│
├── public/                  # Static files
├── package.json             # Dependencies
└── vercel.json              # Vercel config
```

---

### **How Frontend Connects to Backend**

**1. API Client (`lib/supabase.ts`)**

```typescript
// frontend/src/lib/supabase.ts

export const chatAPI = {
  sendMessage: async (message: string) => {
    // Calls backend function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/handle-chat`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ message }),
      }
    )
    return response.json()
  }
}
```

**2. Component Uses API**

```typescript
// frontend/src/components/ChatInterface.tsx

const handleSend = async () => {
  const response = await chatAPI.sendMessage(message)
  setMessages([...messages, response.reply])
}
```

---

### **Frontend Flow**

```
User Action (click, type)
    ↓
React Component (ChatInterface.tsx)
    ↓
API Client (lib/supabase.ts)
    ↓
HTTP Request to Backend
    ↓
Backend Function (handle-chat)
    ↓
Response Back to Frontend
    ↓
Update UI
```

---

## ✏️ How to Edit Frontend

### **Step 1: Open the File**

```bash
# Navigate to frontend
cd frontend

# Edit a component
code src/components/ChatInterface.tsx
# or
nano src/components/ChatInterface.tsx
```

---

### **Step 2: Make Your Changes**

**Example: Change Chat UI**

```typescript
// frontend/src/components/ChatInterface.tsx

// BEFORE:
<div className="bg-white p-4 rounded-lg">
  {message}
</div>

// AFTER: Add custom styling
<div className="bg-blue-100 p-4 rounded-lg shadow-md">
  {message}
</div>
```

**Example: Add New Feature**

```typescript
// frontend/src/components/ChatInterface.tsx

// Add new state
const [newFeature, setNewFeature] = useState(false)

// Add new button
<button onClick={() => setNewFeature(true)}>
  New Feature
</button>
```

---

### **Step 3: Test Locally**

```bash
cd frontend

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# Opens at: http://localhost:5173
```

**What you see:**
- Changes appear **instantly** (hot reload)
- Test your changes in browser
- Check console for errors

---

## 🚀 How to Deploy Frontend Changes

### **Method 1: Deploy via GitHub (Automatic)**

**This is the EASIEST method!**

1. **Make your changes** in code
2. **Commit to Git:**
   ```bash
   cd frontend  # or root directory
   git add .
   git commit -m "Update chat UI"
   git push origin main
   ```
3. **Vercel automatically deploys!** ✅
   - Vercel watches your GitHub repo
   - Detects new commits
   - Builds and deploys automatically
   - Takes 2-3 minutes

**Check deployment:**
- Go to: https://vercel.com/dashboard
- See deployment status
- View live site: https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app

---

### **Method 2: Deploy via Vercel CLI**

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to frontend
cd frontend

# Deploy
vercel --prod
```

**What happens:**
1. Code is uploaded to Vercel
2. Build process runs (`npm run build`)
3. Static files are generated
4. Deployed to CDN
5. Changes are **LIVE immediately** ✅

---

### **Method 3: Deploy via Vercel Dashboard**

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Select your project**
   - `healthcare-scheduler-frontend-bsu6`

3. **Click "Redeploy"**
   - Or trigger new deployment from GitHub

---

### **Update Environment Variables**

**If you need to change API keys or URLs:**

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select project → Settings → Environment Variables

2. **Add/Edit Variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PRODUCTION_URL`

3. **Redeploy**
   - Changes take effect after redeploy

---

## 🔄 Complete Workflow

### **Scenario: Change AI Response Behavior**

**Step 1: Edit Backend**
```bash
cd backend
code supabase/functions/handle-chat/index.ts
# Make your changes
```

**Step 2: Deploy Backend**
```bash
supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx
# ✅ Backend changes are LIVE
```

**Step 3: Test**
- Test the API endpoint directly
- Or test via frontend

---

### **Scenario: Change Chat UI**

**Step 1: Edit Frontend**
```bash
cd frontend
code src/components/ChatInterface.tsx
# Make your changes
```

**Step 2: Test Locally**
```bash
npm run dev
# Test at http://localhost:5173
```

**Step 3: Deploy Frontend**
```bash
git add .
git commit -m "Update chat UI"
git push origin main
# ✅ Vercel automatically deploys (2-3 minutes)
```

---

### **Scenario: Add New Database Table**

**Step 1: Create Migration**
```bash
cd backend
supabase migration new add_new_table
# Edit the migration file
```

**Step 2: Deploy Database**
```bash
supabase db push --project-ref ljxugwfzkbjlrjwpglnx
# ✅ Database changes are LIVE
```

**Step 3: Update Backend Functions** (if needed)
```bash
# Edit functions to use new table
supabase functions deploy --project-ref ljxugwfzkbjlrjwpglnx
```

---

## 📝 Quick Reference

### **Backend Commands**

```bash
# Deploy all functions
cd backend
supabase functions deploy --project-ref ljxugwfzkbjlrjwpglnx

# Deploy single function
supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx

# Deploy database changes
supabase db push --project-ref ljxugwfzkbjlrjwpglnx

# Set secrets
supabase secrets set GOOGLE_AI_API_KEY="key" --project-ref ljxugwfzkbjlrjwpglnx

# List secrets
supabase secrets list --project-ref ljxugwfzkbjlrjwpglnx
```

### **Frontend Commands**

```bash
# Run locally
cd frontend
npm run dev

# Build for production
npm run build

# Deploy (via Git)
git add .
git commit -m "Your message"
git push origin main

# Deploy (via Vercel CLI)
vercel --prod
```

---

## 🎯 Important URLs

### **Backend**
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx
- **Functions**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/functions
- **Database**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/editor
- **Secrets**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/settings/secrets

### **Frontend**
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Production URL**: https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app
- **GitHub**: https://github.com/Shivesh-ctrl/healthcare-scheduler

---

## ✅ Best Practices

1. **Test Locally First**
   - Test backend functions locally before deploying
   - Test frontend changes in dev server

2. **Commit Often**
   - Use Git to track changes
   - Write clear commit messages

3. **Deploy Incrementally**
   - Deploy one function/component at a time
   - Test after each deployment

4. **Check Logs**
   - Backend: Supabase Dashboard → Functions → Logs
   - Frontend: Vercel Dashboard → Deployments → Logs

5. **Backup Before Major Changes**
   - Export database before schema changes
   - Keep Git history clean

---

## 🆘 Troubleshooting

### **Backend Not Updating?**
- Check deployment status in Supabase Dashboard
- Verify function name is correct
- Check function logs for errors

### **Frontend Not Updating?**
- Check Vercel deployment status
- Clear browser cache
- Check build logs in Vercel

### **API Errors?**
- Check backend function logs
- Verify API keys are set
- Check CORS settings

---

That's everything you need to know! 🎉

