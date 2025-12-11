// @ts-ignore - Deno HTTP imports are valid in Supabase Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import type { ChatRequest, ChatResponse } from '../_shared/types.ts';

/**
 * --- Behavior summary ---
 * This function:
 * 1. Extracts appointment details (name, time, day preference, email, insurance) from user message.
 * 2. If the user is logged in (patientIdentifier present), email is NOT required.
 * 3. If required fields missing -> asks follow-up using generateAIResponse.
 * 4. If all required fields present -> creates an appointment row in `appointments` and updates `inquiries`.
 * 5. Returns a ChatResponse containing reply, inquiryId, extractedInfo, needsMoreInfo, and appointmentId if created.
 */

// -------------------- AI extraction (customized prompt) --------------------
async function extractAppointmentInfoWithAI(
  userMessage: string,
  conversationHistory: any[] = []
): Promise<{
  name: string;
  preferred_time: string;
  day_type: string; // "weekday" | "weekend" | ""
  email: string;
  insurance: string;
}> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('AI API key not configured');

  // Build conversation context text (if any)
  let conversationContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    conversationContext = '\n\nPrevious conversation:\n';
    conversationHistory.forEach((msg: any) => {
      if (msg.role === 'user') conversationContext += `User: ${msg.content}\n`;
      else if (msg.role === 'assistant') conversationContext += `Assistant: ${msg.content}\n`;
    });
  }

  // New prompt: extract the exact fields we need and return ONLY JSON
  const prompt = `You are a concise assistant that extracts appointment details from user messages.

User message: ${userMessage}${conversationContext}

Extract these fields and return ONLY a JSON object (no surrounding text) with these keys:
{
  "name": "<patient's full name or empty string>",
  "preferred_time": "<user-provided time or time range, e.g. '2025-12-14 15:00' or 'afternoons 3-5pm' or empty string>",
  "day_type": "<'weekday' or 'weekend' or empty string if not mentioned>",
  "email": "<email address or empty string>",
  "insurance": "<insurance provider name or empty string>"
}

If any field is not present in the message, set it to an empty string "". Do not invent extra fields.`;

  // Try Google Gemini first (if key present), else OpenAI
  try {
    if (Deno.env.get('GOOGLE_AI_API_KEY')) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.0, maxOutputTokens: 300 },
          }),
        }
      );

      if (!response.ok) throw new Error(`Google AI API error: ${response.statusText}`);
      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error('No JSON found in AI response');
    }

    // fallback to OpenAI
    if (Deno.env.get('OPENAI_API_KEY')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a concise extractor. Return only JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.0,
          max_tokens: 300,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || '';
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error('No JSON found in AI response');
    }

    throw new Error('No AI API key configured');
  } catch (err: any) {
    console.error('❌ AI extraction error:', err);
    throw new Error(`AI extraction failed: ${err.message}`);
  }
}

// -------------------- AI reply generation (for follow-ups / confirmations) --------------------
async function generateAIResponse(
  userMessage: string,
  conversationHistory: any[] = [],
  extractedInfo: any = null,
  missingFields: string[] = []
): Promise<string> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('AI API key not configured');

  // Build conversation context
  let conversationContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg: any) => {
      if (msg.role === 'user') conversationContext += `User: ${msg.content}\n`;
      else if (msg.role === 'assistant') conversationContext += `Assistant: ${msg.content}\n`;
    });
  }

  // Build a helpful assistant prompt
  let prompt = `You are a warm scheduling assistant helping users book therapy appointments.

User message: ${userMessage}

`;
  if (conversationContext) prompt += `Previous conversation:\n${conversationContext}\n`;

  if (extractedInfo) {
    prompt += `Extracted info:\n- name: ${extractedInfo.name || 'Not provided'}\n- preferred_time: ${extractedInfo.preferred_time || 'Not provided'}\n- day_type: ${extractedInfo.day_type || 'Not provided'}\n- email: ${extractedInfo.email || 'Not provided'}\n- insurance: ${extractedInfo.insurance || 'Not provided'}\n\n`;
  }

  if (missingFields && missingFields.length > 0) {
    prompt += `Ask for the following missing fields in a single natural, polite sentence: ${missingFields.join(
      ', '
    )}. Do not ask for any other information. Keep it short and friendly.`;
  } else {
    prompt += `All required appointment details are present. Confirm the booking in a short friendly message including the scheduled time and day preference, and say you'll send an email confirmation (if email is available).`;
  }

  try {
    if (Deno.env.get('GOOGLE_AI_API_KEY')) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 250 },
          }),
        }
      );

      if (!response.ok) throw new Error(`Google AI API error: ${response.statusText}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (Deno.env.get('OPENAI_API_KEY')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a warm, empathetic scheduling assistant.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 250,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    throw new Error('No AI API key configured');
  } catch (err: any) {
    console.error('❌ AI response error:', err);
    throw new Error(`AI response generation failed: ${err.message}`);
  }
}

// -------------------- Helpers --------------------
function normalizeDayType(input: string): string {
  if (!input) return '';
  const s = input.toLowerCase();
  if (s.includes('weekend') || s.includes('saturday') || s.includes('sunday')) return 'weekend';
  if (s.includes('weekday') || s.includes('monday') || s.includes('tuesday') || s.includes('wednesday') || s.includes('thursday') || s.includes('friday'))
    return 'weekday';
  return ''; // unknown
}

// -------------------- MAIN --------------------
serve(async (req: Request) => {
  console.log('🚀 handle-chat function called');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      statusText: 'No Content',
      headers: corsHeaders,
    });
  }

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { message, inquiryId, conversationHistory = [], patientIdentifier }: ChatRequest = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Load existing inquiry if provided (optional)
    let currentInquiryId = inquiryId;
    let inquiry: any = null;
    if (currentInquiryId) {
      const { data: inqData, error: inqErr } = await supabase.from('inquiries').select('*').eq('id', currentInquiryId).single();
      if (inqErr) {
        console.warn('⚠️ Could not load inquiry:', inqErr);
      } else {
        inquiry = inqData;
      }
    }

    // 1) Extract appointment info using AI
    let extracted: {
      name: string;
      preferred_time: string;
      day_type: string;
      email: string;
      insurance: string;
    } = { name: '', preferred_time: '', day_type: '', email: '', insurance: '' };

    try {
      extracted = await extractAppointmentInfoWithAI(message, conversationHistory);
      // normalize day_type
      extracted.day_type = normalizeDayType(extracted.day_type);
      console.log('✅ Extracted appointment info:', extracted);
    } catch (err: any) {
      console.error('❌ Extraction failed:', err);
      // If extraction fails, continue with empty extracted object and request missing fields
      extracted = { name: '', preferred_time: '', day_type: '', email: '', insurance: '' };
    }

    // 2) Determine required fields
    const requiresEmail = !patientIdentifier; // if no patientIdentifier, we need email
    const requiredFields = ['name', 'preferred_time', 'day_type', 'insurance'] as const;
    // will add 'email' to required if requiresEmail
    const missingFields: string[] = [];

    // check required ones
    for (const field of requiredFields) {
      if (!extracted[field] || extracted[field].toString().trim() === '') missingFields.push(field);
    }
    if (requiresEmail && (!extracted.email || extracted.email.trim() === '')) missingFields.push('email');

    // 3) If missing fields, ask for them (do not book yet)
    if (missingFields.length > 0) {
      const followUp = await generateAIResponse(message, conversationHistory, extracted, missingFields);

      // Update inquiry conversation history with assistant follow-up
      const newHistory = [
        ...(conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: followUp, timestamp: new Date().toISOString() },
      ];

      // Save/update inquiry with partial info if desired (optional)
      const partialInquiryData: any = {
        problem_description: inquiry?.problem_description || message,
        requested_schedule: extracted.preferred_time || inquiry?.requested_schedule || null,
        insurance_info: extracted.insurance || inquiry?.insurance_info || null,
        extracted_specialty: extracted.name || inquiry?.extracted_specialty || null,
        conversation_history: newHistory,
        status: inquiry?.status || 'pending',
      };
      if (patientIdentifier) partialInquiryData.patient_identifier = patientIdentifier;

      try {
        if (!currentInquiryId) {
          const { data: newInq, error } = await supabase.from('inquiries').insert(partialInquiryData).select().single();
          if (!error) {
            currentInquiryId = newInq.id;
            inquiry = newInq;
          } else {
            console.warn('⚠️ Could not create partial inquiry:', error);
          }
        } else {
          const { data: updatedInq, error } = await supabase.from('inquiries').update(partialInquiryData).eq('id', currentInquiryId).select().single();
          if (!error) inquiry = updatedInq;
          else console.warn('⚠️ Could not update partial inquiry:', error);
        }
      } catch (dbErr) {
        console.error('❌ DB partial inquiry save error:', dbErr);
      }

      const response: ChatResponse = {
        reply: followUp,
        inquiryId: currentInquiryId || '',
        extractedInfo: {
          problem: extracted.name || '', // Using name as problem for now
          specialty: extracted.name || '',
          schedule: extracted.preferred_time || '',
          insurance: extracted.insurance || '',
          patient_name: extracted.name || undefined,
          patient_email: extracted.email || undefined,
        },
        needsMoreInfo: true,
        matchedTherapists: undefined,
      };

      return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4) All required info present -> create appointment
    // Compose appointment record
    const appointmentRecord: any = {
      inquiry_id: currentInquiryId || null,
      patient_identifier: patientIdentifier || null,
      patient_name: extracted.name,
      email: extracted.email || null,
      preferred_time: extracted.preferred_time,
      day_type: extracted.day_type,
      insurance: extracted.insurance,
      status: 'booked',
      created_at: new Date().toISOString(),
    };

    let appointmentId: string | null = null;
    try {
      const { data: createdAppointment, error: createErr } = await supabase.from('appointments').insert(appointmentRecord).select().single();
      if (createErr) {
        console.error('❌ Error creating appointment:', createErr);
        throw createErr;
      }
      appointmentId = createdAppointment.id;
      console.log('✅ Created appointment:', appointmentId);
    } catch (apptErr) {
      console.error('❌ Appointment creation failed:', apptErr);
      // Return an error to user (but gracefully)
      return new Response(JSON.stringify({
        error: 'Failed to create appointment. Please try again later.',
        reply: 'I\'m sorry — I tried to book your appointment but something went wrong. Please try again.',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 5) Update inquiry row: mark booked and attach appointment id
    if (currentInquiryId) {
      try {
        const { data: updatedInq, error: upErr } = await supabase.from('inquiries')
          .update({ status: 'booked', appointment_id: appointmentId })
          .eq('id', currentInquiryId)
          .select()
          .single();
        if (upErr) {
          console.warn('⚠️ Could not update inquiry with appointment_id:', upErr);
        } else {
          inquiry = updatedInq;
        }
      } catch (e) {
        console.warn('⚠️ Exception updating inquiry:', e);
      }
    } else {
      // If there was no inquiry row, you might want to create one pointing to the appointment
      try {
        const newInquiryData = {
          problem_description: message,
          requested_schedule: extracted.preferred_time,
          insurance_info: extracted.insurance,
          extracted_specialty: extracted.name,
          conversation_history: [
            ...(conversationHistory || []),
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: `Appointment booked for ${extracted.preferred_time} (${extracted.day_type}).`, timestamp: new Date().toISOString() }
          ],
          status: 'booked',
          appointment_id: appointmentId,
          patient_identifier: patientIdentifier || null,
        };
        const { data: newInq, error } = await supabase.from('inquiries').insert(newInquiryData).select().single();
        if (!error) {
          currentInquiryId = newInq.id;
          inquiry = newInq;
        } else {
          console.warn('⚠️ Could not create inquiry after appointment:', error);
        }
      } catch (e) {
        console.warn('⚠️ Exception creating inquiry after appointment:', e);
      }
    }

    // 6) Build confirmation reply (use AI to make it friendly)
    const confirmationMessage = await generateAIResponse(message, conversationHistory, extracted, []);

    // Add assistant message to conversation history
    const newHistoryFinal = [
      ...(conversationHistory || []),
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: confirmationMessage, timestamp: new Date().toISOString() },
    ];

    // Optionally persist the final conversation history into inquiries row
    try {
      if (currentInquiryId) {
        await supabase.from('inquiries').update({ conversation_history: newHistoryFinal }).eq('id', currentInquiryId);
      }
    } catch (e) {
      console.warn('⚠️ Could not persist final conversation history:', e);
    }

    // Response back to client
    const response: ChatResponse = {
      reply: confirmationMessage,
      inquiryId: currentInquiryId || '',
      extractedInfo: {
        problem: extracted.name || '', // Using name as problem for now
        specialty: extracted.name || '',
        schedule: extracted.preferred_time || '',
        insurance: extracted.insurance || '',
        patient_name: extracted.name || undefined,
        patient_email: extracted.email || undefined,
      },
      needsMoreInfo: false,
      matchedTherapists: undefined,
      // adding appointmentId for frontend convenience
      // (if your ChatResponse type doesn't include appointmentId, frontend can read this from reply or you can extend the type)
    };

    // Attach appointmentId on top-level so frontend easily shows it
    const responseBody = {
      ...response,
      appointmentId,
    };

    return new Response(JSON.stringify(responseBody), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('❌ Error in handle-chat:', error);
    const errorMessage = error?.message ? String(error.message) : 'An error occurred';
    return new Response(JSON.stringify({
      error: errorMessage,
      reply: 'I apologize, but I encountered a technical issue. Please try again in a moment.'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});
