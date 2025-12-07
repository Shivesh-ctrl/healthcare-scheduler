# 🚢 Deployment Guide

Complete guide for deploying your Healthcare Scheduler backend to production.

## Pre-Deployment Checklist

- ✅ Supabase project created
- ✅ Environment variables configured
- ✅ Database migrations tested locally
- ✅ Edge Functions tested locally
- ✅ API keys validated
- ✅ Google Calendar OAuth configured (if using)
- ✅ Row Level Security policies reviewed

---

## Production Deployment

### 1. Prepare Environment

```bash
# Create production .env
cp .env .env.production

# Update with production values:
# - Production Supabase project
# - Production API keys
# - Production Google OAuth credentials
```

### 2. Deploy Database

```bash
# Link to production project
supabase link --project-ref YOUR_PROD_PROJECT_REF

# Review migrations
supabase db diff

# Push to production
supabase db push

# Verify tables created
# Check Supabase Dashboard → Table Editor
```

### 3. Set Production Secrets

```bash
# Load production environment
source .env.production

# Set all secrets
supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"
supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
supabase secrets set GOOGLE_AI_API_KEY="$GOOGLE_AI_API_KEY"
supabase secrets set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
supabase secrets set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"

# Verify secrets set
supabase secrets list
```

### 4. Deploy Functions

```bash
# Deploy all functions to production
supabase functions deploy --project-ref YOUR_PROD_PROJECT_REF

# Verify deployment
supabase functions list

# Test each function
curl https://YOUR_PROD_PROJECT_REF.supabase.co/functions/v1/handle-chat \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "test"}'
```

### 5. Configure Auth

```bash
# In Supabase Dashboard:
# 1. Go to Authentication → Settings
# 2. Set Site URL to your frontend URL
# 3. Add Redirect URLs
# 4. Configure Email Templates
# 5. Disable public signups (for admin-only access)
```

### 6. Set Up Row Level Security

Already configured in migrations, but verify:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Should return 'true' for all tables
```

### 7. Create Admin User

```bash
# In Supabase Dashboard:
# Authentication → Users → Invite User
# Or use API:

curl -X POST https://YOUR_PROJECT_REF.supabase.co/auth/v1/admin/users \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "secure_password",
    "email_confirm": true
  }'
```

---

## Google Calendar OAuth Setup

### 1. Google Cloud Console

```bash
1. Go to: https://console.cloud.google.com
2. Create new project or select existing
3. Enable Google Calendar API
4. Go to APIs & Services → Credentials
5. Create OAuth 2.0 Client ID (Web Application)
6. Add authorized redirect URIs:
   - https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-oauth-callback
   - https://yourfrontend.com/oauth/callback
7. Save Client ID and Client Secret
```

### 2. Configure OAuth Flow

For each therapist who wants calendar integration:

```bash
# They need to authorize via OAuth
# You'll need to implement an OAuth callback function
# Or manually get refresh tokens using OAuth Playground
```

### 3. Store Refresh Tokens

```sql
-- Update therapist with calendar credentials
UPDATE therapists 
SET 
  google_calendar_id = 'therapist@gmail.com',
  google_refresh_token = 'ya29.a0...'
WHERE email = 'therapist@example.com';
```

---

## Environment Variables

### Required

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# AI (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...

# Application
APP_URL=https://yourfrontend.com
```

### Optional

```bash
# Google Calendar (for booking integration)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://yourapp.com/oauth/callback
```

---

## Monitoring & Logging

### View Function Logs

```bash
# Real-time logs
supabase functions logs handle-chat --follow

# Last 100 lines
supabase functions logs handle-chat --limit 100

# Specific time range
supabase functions logs handle-chat --since 1h
```

### Set Up Alerts

In Supabase Dashboard:
1. Go to Settings → Integrations
2. Add Slack/Discord webhook
3. Configure error alerts

### Monitor Usage

```bash
# Check function invocations
# Supabase Dashboard → Functions → [function-name]

# Check database size
# Dashboard → Settings → Usage
```

---

## Performance Optimization

### 1. Database Indexes

Already created in migrations:
- GIN indexes on arrays (specialties, insurance)
- B-tree indexes on frequently queried columns
- Compound indexes for common queries

### 2. Function Optimization

```typescript
// Use database connection pooling
// Already configured in supabase-client.ts

// Cache therapist data if needed
// Add Redis/Upstash for caching
```

### 3. AI Response Caching

```typescript
// Cache common AI responses
// Store in Supabase or Redis
const cacheKey = `ai:${hash(message)}`;
const cached = await getCached(cacheKey);
if (cached) return cached;
```

---

## Scaling Strategy

### Free Tier Limits

- 500MB database
- 2GB bandwidth
- 500,000 Edge Function invocations
- 50,000 monthly active users

### When to Upgrade

- More than 100 appointments/day → Pro plan ($25/mo)
- Need custom domains → Pro plan
- SLA requirements → Enterprise

### Horizontal Scaling

Supabase handles automatically:
- Database connection pooling
- Edge Function distribution
- CDN for static assets

---

## Backup Strategy

### Automatic Backups

Supabase Pro/Enterprise includes:
- Daily automated backups
- Point-in-time recovery
- 7-day retention

### Manual Backup

```bash
# Export database
supabase db dump -f backup.sql

# Export just data
pg_dump -h db.xxx.supabase.co -U postgres -d postgres \
  --data-only -f data-backup.sql
```

### Restore from Backup

```bash
# Restore database
supabase db reset
psql -h db.xxx.supabase.co -U postgres -d postgres -f backup.sql
```

---

## Security Checklist

- ✅ RLS policies enabled on all tables
- ✅ Service role key stored securely (never in frontend)
- ✅ HTTPS enforced on all endpoints
- ✅ API keys stored in Supabase secrets (not in code)
- ✅ Admin endpoints require authentication
- ✅ Input validation on all endpoints
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ SQL injection prevention (parameterized queries)
- ✅ Google Calendar tokens encrypted

---

## CI/CD Pipeline (Optional)

### GitHub Actions Example

```yaml
name: Deploy to Supabase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        run: npm install -g supabase
      
      - name: Deploy Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_TOKEN }}
        run: |
          supabase functions deploy --project-ref ${{ secrets.PROJECT_REF }}
```

---

## Rollback Procedure

### If Functions Break

```bash
# Deploy previous version
git checkout previous-tag
supabase functions deploy

# Or rollback specific function
supabase functions deploy handle-chat@previous-version
```

### If Database Migration Fails

```bash
# Restore from backup
supabase db reset
psql -f backup.sql

# Or rollback migration
supabase migration revert
```

---

## Health Checks

### Create Health Check Endpoint

```bash
# Add health-check function
supabase functions new health-check

# Returns service status
{
  "status": "healthy",
  "database": "connected",
  "functions": ["handle-chat", "find-therapist", "book-appointment"],
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Monitor Endpoint

```bash
# Ping every 5 minutes
curl https://xxx.supabase.co/functions/v1/health-check

# Set up UptimeRobot or similar
```

---

## Troubleshooting Production

### Function Returns 500

```bash
# Check logs
supabase functions logs [function-name] --limit 50

# Common issues:
# - Missing environment variable
# - API key invalid
# - Database connection failed
```

### Database Connection Issues

```bash
# Check connection limits
SELECT count(*) FROM pg_stat_activity;

# Increase pooler if needed (Pro plan)
```

### High Latency

```bash
# Check function cold starts
# Add function warming if needed

# Optimize database queries
EXPLAIN ANALYZE SELECT * FROM therapists...
```

---

## Support

- **Supabase Discord**: discord.supabase.com
- **Supabase Docs**: supabase.com/docs
- **Status Page**: status.supabase.com

## Next Steps

1. Connect frontend to production backend
2. Set up monitoring dashboards
3. Configure automated backups
4. Add logging/analytics
5. Implement feature flags
6. Set up staging environment

