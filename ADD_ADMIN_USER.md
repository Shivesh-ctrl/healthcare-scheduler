# 👤 How to Add Admin User in Supabase

## Overview

In this system, "admin users" are actually **therapists** who can log in to manage their appointments. The admin dashboard shows data for the therapist linked to the logged-in user.

---

## Method 1: Via Supabase Dashboard (Easiest)

### Step 1: Create User in Authentication

1. Go to: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/auth/users
2. Click **"Add User"** → **"Create new user"**
3. Fill in:
   - **Email**: `admin@example.com` (or your email)
   - **Password**: Create a strong password
   - **Auto Confirm User**: ✅ Check this (so they can login immediately)
4. Click **"Create user"**
5. **Copy the User ID** (you'll need it in the next step)

### Step 2: Link User to a Therapist

You have two options:

#### Option A: Link to Existing Therapist

1. Go to: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/editor
2. Click on **`therapists`** table
3. Find the therapist you want to link
4. Edit the row and set:
   - **`user_id`**: Paste the User ID from Step 1
   - **`email`**: The email you used in Step 1
5. Click **"Save"**

#### Option B: Create New Therapist and Link

1. Go to: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/editor
2. Click on **`therapists`** table
3. Click **"Insert row"**
4. Fill in:
   - **`name`**: Therapist name
   - **`email`**: Same email as Step 1
   - **`user_id`**: Paste the User ID from Step 1
   - **`specialties`**: `["Anxiety", "Depression"]` (JSON array)
   - **`accepted_insurance`**: `["Aetna", "Blue Cross"]` (JSON array)
   - **`bio`**: Therapist bio
   - **`is_active`**: `true`
   - **`timezone`**: `"America/New_York"` (or your timezone)
5. Click **"Save"**

---

## Method 2: Via SQL Editor (Advanced)

### Step 1: Create User

1. Go to: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/sql/new
2. Run this SQL (replace with your email and password):

```sql
-- Create user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',  -- Change this
  crypt('your_password_here', gen_salt('bf')),  -- Change this
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Get the user ID (copy this)
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';
```

### Step 2: Link to Therapist

```sql
-- Link user to therapist (replace USER_ID and therapist details)
INSERT INTO public.therapists (
  name,
  email,
  user_id,
  specialties,
  accepted_insurance,
  bio,
  is_active,
  timezone
)
VALUES (
  'Admin Therapist',
  'admin@example.com',  -- Same email as above
  'USER_ID_FROM_STEP_1',  -- Paste the user ID from Step 1
  '["General Therapy"]'::jsonb,
  '["Aetna", "Blue Cross"]'::jsonb,
  'Admin therapist account',
  true,
  'America/New_York'
);
```

---

## Method 3: Via Frontend Signup (User Self-Registration)

Users can also sign up themselves:

1. Go to your admin page: `/admin`
2. Click the **"Password"** tab
3. Click **"Sign Up"**
4. Enter email and password
5. After signup, you'll need to link them to a therapist record (use Method 1, Step 2)

---

## Verify Admin User

### Test Login

1. Go to your admin page (local: `http://localhost:5173/admin` or deployed URL)
2. Use the email and password you created
3. You should see the admin dashboard with therapist data

### Check in Database

```sql
-- Verify user and therapist are linked
SELECT 
  u.id as user_id,
  u.email,
  t.id as therapist_id,
  t.name as therapist_name
FROM auth.users u
LEFT JOIN public.therapists t ON t.user_id = u.id
WHERE u.email = 'admin@example.com';
```

---

## Troubleshooting

### "No therapist profile found"

This means the user is logged in but not linked to a therapist:
- Check that `therapists.user_id` matches `auth.users.id`
- Verify the user_id was set correctly

### "Unauthorized" error

- Make sure the user exists in `auth.users`
- Check that email confirmation is set (or auto-confirm is enabled)

### Can't see appointments/inquiries

- Verify the therapist record exists
- Check that `is_active = true` in the therapists table

---

## Quick Reference

**Dashboard Links:**
- **Users**: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/auth/users
- **Therapists Table**: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/editor
- **SQL Editor**: https://supabase.com/dashboard/project/gmnqpatcimynhhlehroq/sql/new

---

## Security Notes

- ⚠️ Use strong passwords for admin accounts
- ⚠️ Only link trusted users to therapist accounts
- ⚠️ Consider adding role-based access control if needed
- ⚠️ Regularly review admin users and remove inactive ones

---

**After adding an admin user, they can log in and manage appointments through the admin dashboard!** 🎉

