# Understanding: OAuth Authorization Codes are Single-Use

## 🔴 Why You're Getting This Error

**Error:** "Authorization code invalid or already used"

**Reason:** Google OAuth authorization codes can only be used **once** and expire quickly (usually within 1-10 minutes).

---

## ✅ Solution: Try Again

This is **normal behavior** - if you get this error, simply:

1. **Go back to Admin Dashboard**
   - http://localhost:5173/admin

2. **Click "Connect Calendar" again**
   - This generates a **NEW** authorization code
   - Each click creates a fresh code

3. **Complete the OAuth flow in ONE go**
   - Don't refresh the page
   - Don't go back
   - Don't open multiple tabs
   - Complete from start to finish

4. **It should work!** ✅

---

## 🔍 Why This Happens

### Authorization Code Lifecycle

1. **User clicks "Connect Calendar"**
   - System generates OAuth URL with a unique code request
   - User redirected to Google

2. **User grants permissions**
   - Google generates authorization code
   - Code is valid for ~10 minutes
   - Code can only be used ONCE

3. **Google redirects back**
   - Code is sent to your callback
   - Backend exchanges code for tokens
   - Code becomes invalid after use

### Common Scenarios That Cause "invalid_grant"

1. **Page refresh during OAuth flow**
   - Code gets used, then page refreshes
   - Tries to use same code again → Error

2. **Multiple clicks**
   - Clicking "Connect Calendar" multiple times
   - First code gets used, others become invalid

3. **Browser back button**
   - Going back and trying again
   - Code already used → Error

4. **Code expired**
   - Waiting too long (over 10 minutes)
   - Code expires → Error

---

## ✅ Best Practices

### Do This:
- ✅ Click "Connect Calendar" once
- ✅ Complete OAuth flow in one go
- ✅ Wait for redirect to complete
- ✅ Don't refresh during the flow

### Don't Do This:
- ❌ Don't refresh the page during OAuth
- ❌ Don't click "Connect Calendar" multiple times
- ❌ Don't use browser back button
- ❌ Don't wait too long (codes expire)

---

## 🧪 Testing

If you want to test the OAuth flow:

1. **Start fresh**
   - Go to admin dashboard
   - Click "Connect Calendar" for a therapist

2. **Complete flow**
   - Sign in with Google
   - Grant permissions
   - Wait for redirect

3. **Verify success**
   - Should see success message
   - Therapist should show "Connected" status

---

## 📋 Summary

**Error:** Authorization code invalid or already used  
**Cause:** Codes are single-use and expire quickly  
**Solution:** Click "Connect Calendar" again (generates new code)  

**This is normal - just try again!** ✅

The system is working correctly. Authorization codes are designed to be single-use for security. If you get this error, simply click "Connect Calendar" again to generate a fresh code.

