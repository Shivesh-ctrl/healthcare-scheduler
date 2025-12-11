export interface Therapist {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  specialties: string[];
  accepted_insurance: string[];
  google_calendar_id: string | null;
  google_refresh_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  patient_identifier: string | null;
  patient_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
  problem_description: string;
  requested_schedule: string | null;
  insurance_info: string | null;
  extracted_specialty: string | null;
  matched_therapist_id: string | null;
  status: 'pending' | 'matched' | 'scheduled' | 'failed' | 'cancelled';
  conversation_history: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  inquiry_id: string | null;
  therapist_id: string;
  patient_identifier: string | null;
  patient_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
  start_time: string;
  end_time: string;
  google_calendar_event_id: string | null;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ExtractedInfo {
  problem: string;
  symptoms: string[];
  specialty: string;
  schedule: string;
  insurance: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
}

export interface ChatRequest {
  message: string;
  inquiryId?: string;
  conversationHistory?: ConversationMessage[];
  patientIdentifier?: string;
}

export interface ChatResponse {
  reply: string;
  inquiryId: string;
  extractedInfo?: Partial<ExtractedInfo>;
  needsMoreInfo: boolean;
  matchedTherapists?: Therapist[];
}

export interface GoogleCalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{ email: string }>;
}

