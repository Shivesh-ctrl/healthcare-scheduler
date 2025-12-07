# 🔍 Debug: Empty book-appointment Logs

## Problem
Supabase `book-appointment` function logs are **empty** - no logs appearing.

---

## ✅ What I Fixed

### 1. Added Entry-Point Logging
- Logs **immediately** when function is called (before CORS check)
- Logs request method, URL, and headers
- Logs request body before processing

### 2. Enhanced Frontend Logging
- Logs before API call
- Logs request URL and body
- Logs response status and data
- Logs errors with details

### 3. Better Error Handling
- Catches and logs all errors
- Shows detailed error messages

---

## 🧪 How to Debug

### Step 1: Check Browser Console

1. **Open Chat**: http://localhost:5173/chat
2. **Open DevTools**: Press `F12`
3. **Go to Console tab**
4. **Book an appointment**
5. **Look for logs**:
   ```
   📝 Booking form submitted
   📝 Form data: { ... }
   📤 Calling book-appointment function...
   📤 Request URL: https://...
   📤 Request body: { ... }
   ```

**If you see these logs:**
- ✅ Frontend is calling the function
- ❌ Function might not be receiving the request

**If you DON'T see these logs:**
- ❌ Form submission might be failing
- Check for JavaScript errors

---

### Step 2: Check Network Tab

1. **Open DevTools**: Press `F12`
2. **Go to Network tab**
3. **Book an appointment**
4. **Look for request to `book-appointment`**:
   - Status code (200, 400, 500, etc.)
   - Request payload
   - Response data

**If request shows:**
- **200 OK**: Function was called successfully
- **400/500**: Function was called but returned error
- **CORS error**: CORS issue preventing call
- **Network error**: Function URL might be wrong

---

### Step 3: Check Supabase Logs

#### Option A: Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/functions
2. Click on `book-appointment` function
3. Go to "Logs" tab
4. Look for logs

#### Option B: CLI
```bash
cd backend
supabase functions logs book-appointment
```

**Look for:**
```
🚀 book-appointment function called
📋 Request method: POST
📋 Request URL: ...
📥 Step 1: Receiving booking request...
```

**If you see logs:**
- ✅ Function is being called
- Check for errors in logs

**If logs are still empty:**
- Function might not be getting called
- Check network tab for failed requests
- Check function URL is correct

---

### Step 4: Verify Function URL

Check if the function URL is correct:

1. **Check `.env` file** (frontend):
   ```bash
   VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
   ```

2. **Expected URL**:
   ```
   https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/book-appointment
   ```

3. **Test in browser console**:
   ```javascript
   console.log('Function URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-appointment`)
   ```

---

## 🔍 Common Issues

### Issue 1: Function Not Being Called

**Symptoms:**
- No logs in Supabase
- No network request in browser
- Frontend logs show error

**Possible Causes:**
1. Form submission failing
2. JavaScript error preventing call
3. Function URL incorrect

**Solution:**
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify function URL
4. Check form validation

---

### Issue 2: CORS Error

**Symptoms:**
- Network request shows CORS error
- Browser console shows CORS error
- Request fails before reaching function

**Solution:**
1. Check CORS headers in function
2. Verify request origin is allowed
3. Check `cors.ts` file

---

### Issue 3: Function Error Before Logging

**Symptoms:**
- Network request shows error
- No logs in Supabase
- Function might be crashing early

**Solution:**
1. Check function code for syntax errors
2. Verify all imports are correct
3. Check function deployment status

---

### Issue 4: Logs Not Showing in Dashboard

**Symptoms:**
- Function works (appointments created)
- But logs don't appear in dashboard

**Possible Causes:**
1. Logs delayed (wait a few seconds)
2. Wrong function selected
3. Logs filtered out

**Solution:**
1. Wait 10-30 seconds for logs to appear
2. Refresh dashboard
3. Check CLI logs: `supabase functions logs book-appointment`
4. Verify correct function is selected

---

## 🧪 Test Flow

### Complete Test:

1. **Open Browser Console** (F12)
2. **Go to Network Tab**
3. **Go to Chat**: http://localhost:5173/chat
4. **Book Appointment**:
   - Fill form
   - Submit
5. **Check Console**:
   - Should see: `📝 Booking form submitted`
   - Should see: `📤 Calling book-appointment function...`
   - Should see: `📥 Response status: 200`
6. **Check Network Tab**:
   - Find `book-appointment` request
   - Check status code
   - Check request/response
7. **Check Supabase Logs**:
   ```bash
   cd backend
   supabase functions logs book-appointment --tail
   ```
   - Should see: `🚀 book-appointment function called`
   - Should see: `📥 Step 1: Receiving booking request...`

---

## 📊 Expected Logs

### Browser Console:
```
📝 Booking form submitted
📝 Form data: { name: "...", email: "...", ... }
📝 Therapist ID: "..."
📝 Inquiry ID: "..."
📝 Start time: "..."
📤 Calling book-appointment function...
📤 Request URL: https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/book-appointment
📤 Request body: { therapistId: "...", ... }
📥 Response status: 200
✅ Booking successful: { success: true, ... }
```

### Supabase Function Logs:
```
🚀 book-appointment function called
📋 Request method: POST
📋 Request URL: /functions/v1/book-appointment
📋 Request headers: { ... }
📥 Step 1: Receiving booking request...
📥 Request body received: { ... }
✅ Step 1 Complete: Received inquiryId, therapistId, startTime, patientInfo
🔐 Step 2: Fetching therapist credentials...
...
```

---

## 🆘 Still No Logs?

### Check These:

1. **Function Deployed?**
   ```bash
   cd backend
   supabase functions list
   ```
   Should show `book-appointment`

2. **Function URL Correct?**
   - Check `.env` file
   - Check browser console for URL

3. **Request Actually Sent?**
   - Check Network tab
   - Look for `book-appointment` request

4. **Function Actually Called?**
   - Check Supabase dashboard
   - Check CLI logs
   - Wait 30 seconds for logs to appear

5. **Any Errors?**
   - Check browser console
   - Check network tab
   - Check function logs

---

## ✅ Summary

**I've added:**
- ✅ Entry-point logging (logs immediately when called)
- ✅ Frontend logging (logs before/after API call)
- ✅ Request/response logging
- ✅ Error logging

**Next Steps:**
1. Book an appointment
2. Check browser console
3. Check network tab
4. Check Supabase logs (wait 30 seconds)
5. Share what you see!

The logs should now appear! If they don't, the detailed logging will help identify where the issue is.

