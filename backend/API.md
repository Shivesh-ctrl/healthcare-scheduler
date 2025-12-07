# 📡 API Documentation

Complete API reference for Healthcare Scheduler Backend.

## Base URL

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

## Authentication

All endpoints accept the Supabase anon key or service role key:

```bash
Authorization: Bearer YOUR_KEY
```

Admin endpoints require an authenticated user token.

---

## 1. Handle Chat

**Endpoint**: `POST /handle-chat`

Processes patient messages using AI and extracts structured information.

### Request

```json
{
  "message": "I've been feeling really anxious lately and need help",
  "inquiryId": "optional-uuid-for-continuing-conversation",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Response

```json
{
  "reply": "I'm sorry to hear you're experiencing anxiety. I'd like to help you find the right therapist. Can you tell me which insurance you have?",
  "inquiryId": "uuid-of-inquiry",
  "extractedInfo": {
    "problem": "anxiety",
    "symptoms": ["worry", "nervousness"],
    "specialty": "anxiety",
    "schedule": "weekday afternoons",
    "insurance": "aetna",
    "patient_name": "John Doe",
    "patient_email": "john@example.com",
    "patient_phone": "+1234567890"
  },
  "needsMoreInfo": false,
  "matchedTherapists": [
    {
      "id": "uuid",
      "name": "Dr. Sarah Johnson",
      "specialties": ["anxiety", "depression"],
      "accepted_insurance": ["aetna", "bluecross"],
      "bio": "Licensed Clinical Psychologist..."
    }
  ]
}
```

### Flow

1. First message creates a new inquiry
2. AI extracts information from conversation
3. When enough info is gathered, therapists are matched
4. Returns matched therapists when ready

---

## 2. Find Therapist

**Endpoint**: `POST /find-therapist`

Finds matching therapists based on specialty and insurance.

### Request

```json
{
  "inquiryId": "optional-uuid",
  "specialty": "anxiety",
  "insurance": "aetna",
  "limit": 5
}
```

### Response

```json
{
  "therapists": [
    {
      "id": "uuid",
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@example.com",
      "bio": "Licensed Clinical Psychologist...",
      "specialties": ["anxiety", "depression", "trauma", "ptsd"],
      "accepted_insurance": ["aetna", "bluecross", "cigna"],
      "match_score": 15
    }
  ],
  "count": 3,
  "searchCriteria": {
    "specialty": "anxiety",
    "insurance": "aetna"
  }
}
```

### Matching Logic

- 10 points: Exact specialty match
- 5 points: Insurance match
- +1 point: Each related specialty
- Sorted by match_score (highest first)

---

## 3. Book Appointment

**Endpoint**: `POST /book-appointment`

Creates appointment and optionally adds to Google Calendar.

### Request

```json
{
  "inquiryId": "uuid",
  "therapistId": "uuid",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "patientName": "John Doe",
  "patientEmail": "john@example.com",
  "patientPhone": "+1234567890",
  "notes": "First therapy session"
}
```

### Response

```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "inquiry_id": "uuid",
    "therapist_id": "uuid",
    "patient_name": "John Doe",
    "patient_email": "john@example.com",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:00:00Z",
    "status": "confirmed",
    "google_calendar_event_id": "google-event-id",
    "created_at": "2024-01-15T09:00:00Z"
  },
  "calendarEventCreated": true
}
```

### Error Codes

- `400`: Missing required fields
- `404`: Therapist not found
- `409`: Time slot not available
- `500`: Server error

---

## 4. Get Admin Data

**Endpoint**: `GET /get-admin-data`

Fetches all inquiries, appointments, and statistics for admin dashboard.

**Requires Authentication**: Yes (JWT token from Supabase Auth)

### Request

```bash
GET /get-admin-data
Authorization: Bearer USER_JWT_TOKEN
```

### Response

```json
{
  "inquiries": [
    {
      "id": "uuid",
      "patient_name": "John Doe",
      "patient_email": "john@example.com",
      "problem_description": "Anxiety issues",
      "status": "scheduled",
      "extracted_specialty": "anxiety",
      "insurance_info": "aetna",
      "created_at": "2024-01-15T09:00:00Z",
      "therapists": {
        "id": "uuid",
        "name": "Dr. Sarah Johnson",
        "specialties": ["anxiety", "depression"]
      }
    }
  ],
  "appointments": [
    {
      "id": "uuid",
      "patient_name": "John Doe",
      "start_time": "2024-01-15T10:00:00Z",
      "status": "confirmed",
      "therapists": {
        "id": "uuid",
        "name": "Dr. Sarah Johnson"
      },
      "inquiries": {
        "id": "uuid",
        "problem_description": "Anxiety issues"
      }
    }
  ],
  "therapists": [
    {
      "id": "uuid",
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@example.com",
      "specialties": ["anxiety", "depression"],
      "is_active": true
    }
  ],
  "stats": {
    "totalInquiries": 50,
    "pendingInquiries": 10,
    "matchedInquiries": 15,
    "scheduledInquiries": 25,
    "totalAppointments": 25,
    "confirmedAppointments": 23,
    "activeTherapists": 8
  }
}
```

---

## Data Models

### Therapist

```typescript
{
  id: string;
  name: string;
  email: string;
  bio: string;
  specialties: string[];
  accepted_insurance: string[];
  google_calendar_id: string;
  is_active: boolean;
}
```

### Inquiry

```typescript
{
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  problem_description: string;
  requested_schedule: string;
  insurance_info: string;
  extracted_specialty: string;
  matched_therapist_id: string;
  status: 'pending' | 'matched' | 'scheduled' | 'failed' | 'cancelled';
  conversation_history: ConversationMessage[];
}
```

### Appointment

```typescript
{
  id: string;
  inquiry_id: string;
  therapist_id: string;
  patient_name: string;
  patient_email: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  google_calendar_event_id: string;
  notes: string;
}
```

---

## Sample Therapists

The database comes pre-populated with 8 therapists:

1. **Dr. Sarah Johnson** - Anxiety, Depression, Trauma
2. **Dr. Michael Chen** - Bipolar, Mood Disorders, Medication Management
3. **Dr. Emily Rodriguez** - Couples Therapy, Family Therapy
4. **Dr. James Williams** - Addiction, Substance Abuse
5. **Dr. Lisa Thompson** - Child Therapy, ADHD, Autism
6. **Dr. Robert Martinez** - Career Counseling, Stress Management
7. **Dr. Amanda Davis** - Eating Disorders, Women's Health
8. **Dr. David Lee** - Geriatric, Dementia

---

## Example Flows

### Complete Booking Flow

```bash
# 1. Start conversation
curl -X POST $BASE_URL/handle-chat \
  -H "Authorization: Bearer $KEY" \
  -d '{"message": "I need help with anxiety. I have Aetna insurance."}'
# → Returns inquiryId and matched therapists

# 2. Optional: Get more therapists
curl -X POST $BASE_URL/find-therapist \
  -H "Authorization: Bearer $KEY" \
  -d '{"specialty": "anxiety", "insurance": "aetna"}'
# → Returns scored list of therapists

# 3. Book appointment
curl -X POST $BASE_URL/book-appointment \
  -H "Authorization: Bearer $KEY" \
  -d '{
    "inquiryId": "...",
    "therapistId": "...",
    "startTime": "2024-01-20T14:00:00Z",
    "endTime": "2024-01-20T15:00:00Z",
    "patientName": "John Doe",
    "patientEmail": "john@example.com"
  }'
# → Creates appointment and calendar event
```

### Admin Dashboard Load

```bash
# Get all data for admin view
curl -X GET $BASE_URL/get-admin-data \
  -H "Authorization: Bearer $USER_JWT"
# → Returns inquiries, appointments, stats
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200`: Success
- `400`: Bad Request (missing/invalid parameters)
- `401`: Unauthorized (missing/invalid auth)
- `404`: Not Found
- `409`: Conflict (e.g., time slot unavailable)
- `500`: Internal Server Error

---

## Rate Limiting

Supabase Edge Functions have default limits:
- 500 requests/minute per IP
- 10,000 requests/day on free tier

For production, upgrade to Pro tier for higher limits.

---

## CORS

All endpoints support CORS with:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE`
- `Access-Control-Allow-Headers: authorization, content-type`

---

## Webhooks (Future)

To add webhooks for appointment notifications:

1. Add webhook URL to therapist/patient records
2. Modify `book-appointment` function to call webhook
3. Include appointment details in POST body

Example:
```typescript
await fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify({ event: 'appointment.created', data: appointment })
});
```

