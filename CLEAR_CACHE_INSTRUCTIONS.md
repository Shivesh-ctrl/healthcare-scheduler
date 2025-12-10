# Complete Cache & Data Cleanup Instructions

## 🗑️ Step 1: Clear Supabase Inquiries (Conversation History)

### Option A: Using Supabase Dashboard (RECOMMENDED)
1. Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx
2. Click on **SQL Editor** in the left sidebar
3. Create a new query and paste this:

```sql
-- Clear all past inquiries (conversation history)
DELETE FROM inquiries WHERE id IS NOT NULL;

-- Verify deletion
SELECT COUNT(*) FROM inquiries;
```

4. Click **Run** (or press Cmd+Enter)
5. You should see "0" rows after verification

### Option B: Using Supabase CLI
```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler/backend
supabase db execute --file clear_inquiries.sql --linked
```

---

## 🧹 Step 2: Clear Browser Cache

### Chrome/Edge:
1. Go to your app: https://healthcare-scheduler-frontend-bsu6.vercel.app
2. Press: **Cmd + Shift + Delete** (Mac) or **Ctrl + Shift + Delete** (Windows)
3. Select:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
4. Time range: **All time**
5. Click **Clear data**

### Quick Method (Any Browser):
1. Go to: https://healthcare-scheduler-frontend-bsu6.vercel.app
2. Press: **Cmd + Shift + R** (Mac) or **Ctrl + Shift + R** (Windows)
   - This does a "hard refresh" and clears cache for that page

---

## 🔄 Step 3: Clear Session & LocalStorage

### In Browser Console:
1. Go to: https://healthcare-scheduler-frontend-bsu6.vercel.app
2. Press **F12** or **Cmd+Option+I** to open DevTools
3. Go to **Console** tab
4. Paste and run:

```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name)));
console.log('✅ All browser storage cleared!');
```

5. Close DevTools
6. **Refresh the page** (Cmd+R or Ctrl+R)

---

## 🚀 Step 4: Test Fresh

1. **Logout** if logged in
2. Close all tabs with your app
3. Open a **new incognito/private window**
4. Go to: https://healthcare-scheduler-frontend-bsu6.vercel.app
5. **Signup/Login** with a new test account or existing account
6. Start fresh conversation: "I have anxiety and Aetna insurance"

---

## ✅ What Gets Cleared

| Item | What | Why |
|------|------|-----|
| **inquiries table** | Past conversations | No old context affecting AI |
| **Browser cache** | Cached API responses | Fresh API calls |
| **LocalStorage** | Stored user data | Fresh session |
| **SessionStorage** | Temporary data | Clean state |
| **IndexedDB** | Cached databases | No stale data |

---

## 🎯 Expected Result After Cleanup

When you test:
- ✅ No "Jasmine Goins, LCSW" mentions
- ✅ No location questions
- ✅ Clean, professional responses
- ✅ No reference to past conversations

---

## 🆘 If Issues Persist

Run this diagnostic:
```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler/backend
supabase functions logs handle-chat --limit 50
```

Look for lines with:
- `🧹 Removed "Jasmine Goins"` ← Should see this
- `✅ GUARANTEED CLEANUP COMPLETE` ← Should see this

If you DON'T see these logs, the new code isn't deployed yet.

