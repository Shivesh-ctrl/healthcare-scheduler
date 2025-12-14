# 🔧 Blank Page Fix - Troubleshooting Guide

## Issue: Page Shows Blank at http://localhost:5173

### Quick Checks:

1. **Open Browser Console (F12 or Cmd+Option+I)**
   - Look for any red error messages
   - Common errors:
     - "Cannot find module"
     - "Failed to load resource"
     - "Uncaught TypeError"

2. **Check Network Tab**
   - See if JavaScript files are loading
   - Check for 404 errors

3. **Verify Dev Server is Running**
   ```bash
   cd frontend
   npm run dev
   ```
   Should show: `Local: http://localhost:5173/`

---

## Common Causes & Fixes

### 1. JavaScript Errors in Console

**Check browser console for errors:**
- Open DevTools (F12)
- Go to Console tab
- Look for red errors

**Common fixes:**
- Missing dependencies: `npm install`
- Import errors: Check file paths
- TypeScript errors: Check `npm run build`

### 2. Missing Environment Variables

**Check `.env` file exists:**
```bash
cd frontend
cat .env
```

Should have:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 3. React Not Mounting

**Check if root element exists:**
- Open browser DevTools
- Check Elements tab
- Look for `<div id="root"></div>`
- If empty, React isn't mounting

### 4. Route Issues

**Try accessing different routes:**
- http://localhost:5173/chat
- http://localhost:5173/admin

### 5. Clear Cache

**Hard refresh:**
- Mac: Cmd+Shift+R
- Windows: Ctrl+Shift+R

**Or clear browser cache:**
- DevTools → Application → Clear Storage

---

## Debug Steps

### Step 1: Check Console Errors

1. Open http://localhost:5173
2. Press F12 (or Cmd+Option+I on Mac)
3. Go to Console tab
4. Look for errors
5. Copy any error messages

### Step 2: Check Network Requests

1. Open DevTools → Network tab
2. Refresh page
3. Check if files are loading:
   - `index.html` ✅
   - `main.tsx` ✅
   - `App.tsx` ✅
   - Any 404 errors? ❌

### Step 3: Verify Server is Running

```bash
cd /Users/shiveshsrivastava/Desktop/AI_scheduler-main/frontend
npm run dev
```

Should see:
```
VITE v7.2.6  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Step 4: Check Build

```bash
cd frontend
npm run build
```

If build fails, fix those errors first.

---

## Quick Fixes

### Restart Dev Server

```bash
# Kill existing server
pkill -f vite

# Start fresh
cd frontend
npm run dev
```

### Reinstall Dependencies

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Check for TypeScript Errors

```bash
cd frontend
npx tsc --noEmit
```

---

## Still Not Working?

**Share these details:**
1. Browser console errors (screenshot or copy text)
2. Network tab errors (any 404s?)
3. Terminal output from `npm run dev`
4. What you see (completely blank? loading spinner? error message?)

---

**Most common issue:** JavaScript error in browser console. Always check there first!

