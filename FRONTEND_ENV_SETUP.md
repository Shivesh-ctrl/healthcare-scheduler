# 📋 Frontend Environment Setup

## ✅ Secrets Set

- ✅ `GEMINI_API_KEY` - Set successfully!

## 📝 Create Frontend .env File

You need to create `frontend/.env` with your Supabase credentials:

### Get Your Credentials

1. Go to: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/settings/api

2. Copy these values:
   - **Project URL**: `https://gmnqpatcimynhhlehroq.supabase.co`
   - **anon public key**: (Find it in the "Project API keys" section, under "anon" "public")

### Create .env File

Create `frontend/.env` with:

```env
VITE_SUPABASE_URL=https://gmnqpatcimynhhlehroq.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Replace `your_anon_key_here` with the actual anon key from the dashboard!**

---

## 🔧 Quick Setup

Run this command to create the file (then edit to add your anon key):

```bash
cat > frontend/.env << 'EOF'
VITE_SUPABASE_URL=https://gmnqpatcimynhhlehroq.supabase.co
VITE_SUPABASE_ANON_KEY=
EOF
```

Then open `frontend/.env` and add your anon key.

---

## ✅ Verify

After creating the file, test locally:

```bash
cd frontend
npm install
npm run dev
```

The app should connect to your Supabase backend!

