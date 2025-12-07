# Healthcare Scheduler Backend

Complete Supabase backend for the Healthcare Patient Scheduling Chatbot using Vercel AI SDK.

## 🏗️ Architecture

- **Database**: PostgreSQL (Supabase)
- **Edge Functions**: Deno TypeScript
- **AI Integration**: Vercel AI SDK (supports OpenAI, Anthropic, Google)
- **Calendar**: Google Calendar API integration
- **Auth**: Supabase Auth for admin dashboard

## 📁 Project Structure

```
healthcare-scheduler-backend/
├── supabase/
│   ├── config.toml                 # Supabase configuration
│   ├── migrations/                 # Database migrations
│   │   ├── 00001_initial_schema.sql
│   │   └── 00002_row_level_security.sql
│   └── functions/                  # Edge Functions
│       ├── _shared/                # Shared utilities
│       │   ├── types.ts
│       │   ├── supabase-client.ts
│       │   ├── ai-provider.ts
│       │   ├── google-calendar.ts
│       │   └── cors.ts
│       ├── handle-chat/            # AI chat handler
│       ├── find-therapist/         # Therapist matching
│       ├── book-appointment/       # Appointment booking
│       └── get-admin-data/         # Admin dashboard data
├── .env.example                    # Environment variables template
├── package.json
├── deno.json
└── README.md
```

## 🚀 Setup Instructions

### 1. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/) (for local development)
- API keys for your chosen AI provider
- Google Cloud Platform account (for Calendar API)

### 2. Create Supabase Project

```bash
# Login to Supabase
supabase login

# Link to your project (or create new one at https://supabase.com)
supabase link --project-ref your-project-ref
```

### 3. Environment Variables

Copy `.env.example` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from Supabase dashboard)
- At least one AI API key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_AI_API_KEY`)
- Google OAuth credentials (optional, for calendar integration)

### 4. Set Function Secrets

```bash
# Set secrets for Edge Functions
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set ANTHROPIC_API_KEY=your_key
supabase secrets set GOOGLE_AI_API_KEY=your_key
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
```

### 5. Run Database Migrations

```bash
# Push migrations to your database
supabase db push

# Or reset database with migrations
supabase db reset
```

This will create:
- `therapists` table (with 8 sample therapists)
- `inquiries` table
- `appointments` table
- Row Level Security policies
- Indexes for performance

### 6. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy handle-chat
supabase functions deploy find-therapist
supabase functions deploy book-appointment
supabase functions deploy get-admin-data
```

### 7. Test Locally (Optional)

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve
```

## 📡 API Endpoints

### 1. Handle Chat - `/handle-chat`

Processes patient messages using AI and extracts information.

**Request:**
```json
{
  "message": "I've been feeling really anxious lately",
  "inquiryId": "optional-inquiry-id",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "reply": "I'm sorry to hear you're experiencing anxiety...",
  "inquiryId": "uuid",
  "extractedInfo": {
    "specialty": "anxiety",
    "insurance": "aetna",
    "patient_name": "John Doe"
  },
  "needsMoreInfo": false,
  "matchedTherapists": [...]
}
```

### 2. Find Therapist - `/find-therapist`

Matches patients with therapists based on specialty and insurance.

**Request:**
```json
{
  "inquiryId": "uuid",
  "specialty": "anxiety",
  "insurance": "aetna",
  "limit": 5
}
```

**Response:**
```json
{
  "therapists": [...],
  "count": 3,
  "searchCriteria": {
    "specialty": "anxiety",
    "insurance": "aetna"
  }
}
```

### 3. Book Appointment - `/book-appointment`

Creates appointment and Google Calendar event.

**Request:**
```json
{
  "inquiryId": "uuid",
  "therapistId": "uuid",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "patientName": "John Doe",
  "patientEmail": "john@example.com",
  "patientPhone": "+1234567890",
  "notes": "First session"
}
```

**Response:**
```json
{
  "success": true,
  "appointment": {...},
  "calendarEventCreated": true
}
```

### 4. Get Admin Data - `/get-admin-data`

Fetches all inquiries, appointments, and statistics (requires auth).

**Headers:**
```
Authorization: Bearer your_supabase_jwt_token
```

**Response:**
```json
{
  "inquiries": [...],
  "appointments": [...],
  "therapists": [...],
  "stats": {
    "totalInquiries": 50,
    "pendingInquiries": 10,
    "scheduledInquiries": 30
  }
}
```

## 🤖 AI Provider Configuration

The backend uses Vercel AI SDK and supports multiple providers:

### OpenAI
```typescript
// Default provider
model: openai('gpt-4-turbo-preview')
```

### Anthropic (Claude)
```typescript
model: anthropic('claude-3-5-sonnet-20241022')
```

### Google (Gemini)
```typescript
model: google('gemini-1.5-pro-latest')
```

Switch providers in `_shared/ai-provider.ts` or pass provider parameter.

## 🗄️ Database Schema

### Therapists
- Stores therapist profiles with specialties and accepted insurance
- Sample data included in migrations

### Inquiries
- Captures patient conversations and extracted information
- Tracks matching status

### Appointments
- Stores confirmed appointments
- Links to Google Calendar events

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Service role required for Edge Functions
- Admin endpoints require JWT authentication
- Google Calendar tokens encrypted at rest

## 📝 Development Workflow

1. **Modify Schema**: Edit migration files in `supabase/migrations/`
2. **Update Functions**: Edit functions in `supabase/functions/`
3. **Test Locally**: `supabase functions serve`
4. **Deploy**: `supabase functions deploy`

## 🔧 Troubleshooting

### Functions not deploying
```bash
# Check logs
supabase functions logs handle-chat

# Verify secrets
supabase secrets list
```

### Database issues
```bash
# Reset database
supabase db reset

# Check status
supabase status
```

### AI errors
- Verify API keys are set correctly
- Check provider model names
- Review function logs

## 📚 Next Steps

1. **Frontend Integration**: Connect React app to these endpoints
2. **Admin Auth**: Set up admin users in Supabase Auth
3. **Google Calendar OAuth**: Implement OAuth flow for therapists
4. **Notifications**: Add email/SMS notifications
5. **Testing**: Add unit tests for Edge Functions

## 🔗 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Google Calendar API](https://developers.google.com/calendar)

## 📄 License

MIT

