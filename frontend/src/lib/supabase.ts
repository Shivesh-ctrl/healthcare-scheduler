import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type {
  ChatRequest,
  ChatResponse,
  FindTherapistRequest,
  FindTherapistResponse,
  BookAppointmentRequest,
  BookAppointmentResponse,
  AdminData,
  Session,
} from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for API calls
export const chatAPI = {
  sendMessage: async (
    message: string,
    inquiryId: string | null = null,
    conversationHistory: ChatRequest['conversationHistory'] = []
  ): Promise<ChatResponse> => {
    // Get user's session token to send authenticated email
    const { data: { session } } = await supabase.auth.getSession()
    const authToken = session?.access_token || supabaseAnonKey
    
    // Create AbortController for timeout
    // Increased timeout to 90 seconds to allow for AI processing time
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000) // 90 second timeout
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/handle-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ message, inquiryId, conversationHistory }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        let errorMessage = `Failed to send message: ${response.status} ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          } else if (errorData.reply) {
            errorMessage = errorData.reply
          }
        } catch {
          try {
            const errorText = await response.text()
            if (errorText) {
              errorMessage = errorText
            }
          } catch {
            // Use default error message
          }
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      
      // Validate response format
      if (!data.reply) {
        throw new Error('Invalid response format: missing reply field')
      }
      
      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. The server is taking too long to respond. Please try again.')
      }
      
      // Handle network errors (Failed to fetch)
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || !error.message) {
        throw new Error('Failed to connect to the server. Please check your internet connection and try again.')
      }
      
      // Re-throw with original error message if it exists
      if (error.message) {
        throw error
      }
      
      // Fallback for unknown errors
      throw new Error('An unexpected error occurred. Please try again.')
    }
  }
}

export const therapistAPI = {
  findTherapist: async (specialty: string, insurance: string): Promise<FindTherapistResponse> => {
    const response = await fetch(`${supabaseUrl}/functions/v1/find-therapist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ specialty, insurance }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to find therapist: ${error}`)
    }
    
    return response.json()
  }
}

export const appointmentAPI = {
  bookAppointment: async (
    therapistId: string,
    inquiryId: string | null,
    startTime: string,
    patientInfo: BookAppointmentRequest['patientInfo']
  ): Promise<BookAppointmentResponse> => {
    const requestBody = { 
      therapistId, 
      inquiryId, 
      startTime, 
      patientInfo 
    };
    
    console.log('📤 Calling book-appointment function...');
    console.log('📤 Request URL:', `${supabaseUrl}/functions/v1/book-appointment`);
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    try {
    const response = await fetch(`${supabaseUrl}/functions/v1/book-appointment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
        body: JSON.stringify(requestBody),
      })
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const error = await response.text()
        console.error('❌ Booking failed:', error);
      throw new Error(`Failed to book appointment: ${error}`)
    }
    
      const result = await response.json();
      console.log('✅ Booking successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Error calling book-appointment:', error);
      throw error;
    }
  }
}

export const adminAPI = {
  getData: async (session: Session): Promise<AdminData> => {
    const response = await fetch(`${supabaseUrl}/functions/v1/get-admin-data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get admin data: ${error}`)
    }
    
    return response.json()
  },

  getOAuthUrl: async (therapistId: string): Promise<{ oauth_url: string }> => {
    const response = await fetch(`${supabaseUrl}/functions/v1/get-oauth-url?therapist_id=${therapistId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get OAuth URL: ${error}`)
    }
    
    return response.json()
  }
}

