# 📧 Email Verification Guide

## 🔍 Current Status

**Email confirmation is currently DISABLED** in your Supabase project.

This means:
- ✅ Users can sign up and immediately log in
- ❌ No verification email is sent
- ✅ Account is created instantly

---

## 📋 How Email Verification Works (When Enabled)

### **Step-by-Step Flow:**

1. **User Signs Up**
   ```
   User enters email + password
   ↓
   Clicks "Create Account"
   ↓
   Supabase creates account (unconfirmed)
   ↓
   Supabase sends verification email
   ```

2. **User Receives Email**
   ```
   Email sent to: user@example.com
   Subject: "Confirm your signup"
   Contains: Confirmation link
   Link format: https://your-site.com/chat#access_token=...&refresh_token=...
   ```

3. **User Clicks Link**
   ```
   User clicks link in email
   ↓
   Redirects to: /chat (or configured redirect URL)
   ↓
   URL contains tokens in hash: #access_token=...&refresh_token=...
   ↓
   Frontend extracts tokens
   ↓
   Creates session automatically
   ↓
   User is logged in
   ```

4. **Account Confirmed**
   ```
   User can now log in normally
   Account status: confirmed
   ```

---

## ⚙️ How It's Configured in Your Code

### **SignUp Component (`frontend/src/components/SignUp.tsx`)**

```typescript
// When user signs up
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${productionUrl}/chat`,  // Where to redirect after confirmation
  },
})

// Check if email confirmation is required
if (session) {
  // Email confirmation DISABLED - user logged in immediately
  navigate('/chat')
} else {
  // Email confirmation ENABLED - show "Check Your Email" screen
  setNeedsConfirmation(true)
}
```

### **Email Confirmation Handler (`frontend/src/components/AdminDashboard.tsx` & `ChatInterface.tsx`)**

```typescript
// When user clicks email link, tokens are in URL hash
const hashParams = new URLSearchParams(window.location.hash.substring(1))
const accessToken = hashParams.get('access_token')
const refreshToken = hashParams.get('refresh_token')

// Exchange tokens for session
await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
})

// User is now logged in!
```

---

## 🔧 How to Enable Email Verification

### **Option 1: Via Supabase Dashboard (Recommended)**

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/auth/providers

2. **Enable Email Confirmation**
   - Go to **Authentication** → **Settings**
   - Find **"Enable email confirmations"**
   - Toggle it **ON**
   - Click **"Save"**

3. **Configure Email Settings**
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation email template (optional)
   - Set **Site URL** to your production URL

4. **Set Redirect URLs**
   - Go to **Authentication** → **URL Configuration**
   - **Site URL**: `https://healthcare-scheduler-frontend-bsu6-72jpizn4w.vercel.app`
   - **Redirect URLs**: Add your production URLs

### **Option 2: Via Config File (Local Development)**

In `backend/supabase/config.toml`:
```toml
[auth.email]
enable_signup = true
enable_confirmations = true  # Change from false to true
```

Then restart Supabase locally.

---

## 📧 Email Configuration

### **Email Provider Options:**

1. **Supabase Default (Free Tier)**
   - Uses Supabase's email service
   - Limited to 3 emails/hour (free tier)
   - Good for testing

2. **Custom SMTP (Recommended for Production)**
   - Use your own email service (Gmail, SendGrid, etc.)
   - Higher email limits
   - Better deliverability

### **To Configure Custom SMTP:**

1. **Go to Supabase Dashboard**
   - **Authentication** → **Settings** → **SMTP Settings**

2. **Enter SMTP Details**
   - **SMTP Host**: `smtp.gmail.com` (for Gmail)
   - **SMTP Port**: `587`
   - **SMTP User**: Your email
   - **SMTP Password**: App password (not regular password)
   - **Sender Email**: Your email
   - **Sender Name**: "Healthcare Scheduler"

3. **Save Settings**

---

## 🔄 Current Behavior (Email Confirmation Disabled)

**What Happens Now:**

1. User signs up → Account created immediately
2. User is logged in automatically
3. No email sent
4. User can use the app right away

**Code Flow:**
```typescript
signUp() → session exists → navigate('/chat') ✅
```

---

## 🔄 If Email Confirmation Was Enabled

**What Would Happen:**

1. User signs up → Account created (unconfirmed)
2. Verification email sent
3. User sees "Check Your Email" screen
4. User clicks link in email
5. Redirects to `/chat` with tokens
6. Frontend creates session
7. User is logged in

**Code Flow:**
```typescript
signUp() → no session → setNeedsConfirmation(true) → 
User clicks email link → tokens in URL → 
setSession() → navigate('/chat') ✅
```

---

## 📝 Email Template Customization

### **Where to Customize:**

1. **Supabase Dashboard**
   - **Authentication** → **Email Templates**
   - Select **"Confirm signup"** template
   - Customize subject and body

### **Available Variables:**
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Email }}` - User's email
- `{{ .SiteURL }}` - Your site URL

### **Example Template:**
```
Subject: Confirm your Healthcare Scheduler account

Hi!

Click the link below to confirm your account:
{{ .ConfirmationURL }}

This link will expire in 24 hours.

Thanks,
Healthcare Scheduler Team
```

---

## ✅ Testing Email Verification

### **If Enabled:**

1. **Sign up with a test email**
2. **Check your inbox** (and spam folder)
3. **Click the confirmation link**
4. **Verify you're logged in**

### **If Disabled (Current):**

1. **Sign up**
2. **You're immediately logged in**
3. **No email sent**

---

## 🎯 Summary

**Current Setup:**
- ❌ Email confirmation: **DISABLED**
- ✅ Users can sign up and use app immediately
- ✅ No email verification required

**To Enable:**
1. Go to Supabase Dashboard → Auth → Settings
2. Enable "Email confirmations"
3. Configure SMTP (optional, for production)
4. Set redirect URLs
5. Users will need to verify email before using app

**Email Flow (When Enabled):**
```
Sign Up → Email Sent → User Clicks Link → 
Redirects to /chat → Session Created → Logged In ✅
```

---

## 🔗 Important Links

- **Supabase Auth Settings**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/auth/providers
- **Email Templates**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/auth/templates
- **URL Configuration**: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/auth/url-configuration

---

That's how email verification works! 📧

