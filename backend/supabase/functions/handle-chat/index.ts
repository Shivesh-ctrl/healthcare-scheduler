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
  problem: string;
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
  "insurance": "<insurance provider name or empty string>",
  "problem": "<the main problem/issue mentioned, e.g. 'stress', 'anxiety', 'depression' or empty string>"
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
  missingFields: string[] = [],
  isLoggedIn: boolean = false
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
    prompt += `Extracted info:\n- problem: ${extractedInfo.problem || 'Not provided'}\n- insurance: ${extractedInfo.insurance || 'Not provided'}\n- name: ${extractedInfo.name || 'Not provided'}\n- preferred_time: ${extractedInfo.preferred_time || 'Not provided'}\n- day_type: ${extractedInfo.day_type || 'Not provided'}\n- email: ${extractedInfo.email || 'Not provided'}\n\n`;
  }

  if (missingFields && missingFields.length > 0) {
    // First acknowledge what the user provided, then ask for missing fields
    const hasProblem = extractedInfo?.problem && extractedInfo.problem.trim() !== '';
    const hasInsurance = extractedInfo?.insurance && extractedInfo.insurance.trim() !== '';
    
    let acknowledgePart = '';
    if (hasProblem && hasInsurance) {
      acknowledgePart = `First, be empathetic and acknowledge the user's problem (${extractedInfo.problem}) and insurance (${extractedInfo.insurance}). Show understanding and warmth. Then, `;
    } else if (hasProblem) {
      acknowledgePart = `First, be empathetic and acknowledge the user's problem (${extractedInfo.problem}). Show understanding and warmth. Then, `;
    } else if (hasInsurance) {
      acknowledgePart = `First, be empathetic and acknowledge the user's insurance (${extractedInfo.insurance}). Show understanding and warmth. Then, `;
    }
    
    // Filter out email if user is logged in
    const fieldsToAsk = isLoggedIn ? missingFields.filter(f => f !== 'email') : missingFields;
    
    // Format fields for better readability
    const fieldLabels: Record<string, string> = {
      'name': 'your name',
      'preferred_time': 'preferred time for appointments (morning, afternoon, evening)',
      'day_type': 'what days of the week work best for you',
      'email': 'your email address (so I can send you appointment confirmations)',
      'insurance': 'your insurance provider'
    };
    
    const formattedFields = fieldsToAsk.map(f => fieldLabels[f] || f);
    
    prompt += `${acknowledgePart}ask for the following missing information in a well-formatted way using bullet points and bold text where appropriate. Format your response like this:

**To get started, could you please share:**
• [Field 1]
• [Field 2]
• [Field 3]

IMPORTANT RULES:
- Be warm, empathetic, and understanding
- NEVER ask for specific insurance plan details (PPO, HMO, etc.) - just the insurance name is enough
- If the user mentions any crisis, emergency, or suicidal thoughts, immediately provide these helpline numbers:
  * 988 (Suicide & Crisis Lifeline - call or text)
  * Crisis Text Line: 741741
  * National Suicide Prevention Lifeline: 1-800-273-8255
- Keep it warm, friendly, and professional. Use **bold** for emphasis.

Missing fields to ask for: ${formattedFields.join(', ')}`;
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
      problem: string;
    } = { name: '', preferred_time: '', day_type: '', email: '', insurance: '', problem: '' };

    try {
      extracted = await extractAppointmentInfoWithAI(message, conversationHistory);
      // normalize day_type
      extracted.day_type = normalizeDayType(extracted.day_type);
      console.log('✅ Extracted appointment info:', extracted);
    } catch (err: any) {
      console.error('❌ Extraction failed:', err);
      // If extraction fails, continue with empty extracted object and request missing fields
      extracted = { name: '', preferred_time: '', day_type: '', email: '', insurance: '', problem: '' };
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
      const followUp = await generateAIResponse(message, conversationHistory, extracted, missingFields, !!patientIdentifier);

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

    // 4) All required info present -> find matching therapists first
    console.log('🔍 Finding matching therapists...');
    
    // Normalize insurance for matching
    const normalizeInsurance = (ins: string): string => {
      const normalized = ins.toLowerCase().trim();
      if (normalized.includes('blue cross') || normalized.includes('bcbs') || normalized.includes('bluecross')) {
        return 'blue cross blue shield';
      }
      if (normalized.includes('aetna')) return 'aetna';
      if (normalized.includes('cigna')) return 'cigna';
      if (normalized.includes('united') && normalized.includes('health')) return 'united healthcare';
      if (normalized.includes('medicare')) return 'medicare';
      if (normalized.includes('medicaid')) return 'medicaid';
      if (normalized.includes('humana')) return 'humana';
      return normalized;
    };

    const insuranceNormalized = normalizeInsurance(extracted.insurance);
    const problemLower = extracted.problem.toLowerCase().trim();

    // Fetch all active therapists
    const { data: allTherapists, error: therapistsError } = await supabase
      .from('therapists')
      .select('*')
      .eq('is_active', true);

    if (therapistsError) {
      console.error('❌ Error fetching therapists:', therapistsError);
    }

    // Filter therapists based on insurance and specialty/problem
    let matchedTherapists: any[] = [];
    if (allTherapists && allTherapists.length > 0) {
      matchedTherapists = allTherapists.filter((therapist: any) => {
        // Check insurance match
        const hasInsurance = therapist.accepted_insurance && 
          Array.isArray(therapist.accepted_insurance) &&
          therapist.accepted_insurance.some((ins: string) => {
            const insNormalized = normalizeInsurance(ins);
            return insNormalized.includes(insuranceNormalized) || 
                   insuranceNormalized.includes(insNormalized);
          });

        // Check specialty/problem match in specialties array or bio
        const hasSpecialty = therapist.specialties && 
          Array.isArray(therapist.specialties) &&
          therapist.specialties.some((s: string) => 
            s.toLowerCase().includes(problemLower) || 
            problemLower.includes(s.toLowerCase())
          );

        // Also check bio if problem not found in specialties
        const bioMatch = therapist.bio && 
          therapist.bio.toLowerCase().includes(problemLower);

        return hasInsurance && (hasSpecialty || bioMatch);
      });

      // Limit to top 3 matches
      matchedTherapists = matchedTherapists.slice(0, 3);
      console.log(`✅ Found ${matchedTherapists.length} matching therapists`);
    }

    // If we have matched therapists, show them to the user
    if (matchedTherapists.length > 0) {
      // Build response showing matched therapists
      let therapistListMessage = `Great! I found ${matchedTherapists.length} therapist${matchedTherapists.length > 1 ? 's' : ''} that match your needs:\n\n`;
      
      matchedTherapists.forEach((therapist: any, index: number) => {
        therapistListMessage += `**${index + 1}. ${therapist.name}**\n`;
        if (therapist.bio) {
          therapistListMessage += `Bio: ${therapist.bio}\n`;
        }
        if (extracted.preferred_time) {
          therapistListMessage += `Available: ${extracted.preferred_time}`;
          if (extracted.day_type) {
            therapistListMessage += ` (${extracted.day_type})`;
          }
          therapistListMessage += `\n`;
        }
        therapistListMessage += `\n`;
      });

      therapistListMessage += `Would you like to book an appointment with one of these therapists?`;

      // Update conversation history
      const newHistory = [
        ...(conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: therapistListMessage, timestamp: new Date().toISOString() },
      ];

      // Update inquiry
      const inquiryUpdateData: any = {
        problem_description: inquiry?.problem_description || message,
        requested_schedule: extracted.preferred_time || inquiry?.requested_schedule || null,
        insurance_info: extracted.insurance || inquiry?.insurance_info || null,
        extracted_specialty: extracted.problem || inquiry?.extracted_specialty || null,
        conversation_history: newHistory,
        status: 'matched',
      };
      if (patientIdentifier) inquiryUpdateData.patient_identifier = patientIdentifier;
      if (matchedTherapists.length > 0) {
        inquiryUpdateData.matched_therapist_id = matchedTherapists[0].id;
      }

      try {
        if (!currentInquiryId) {
          const { data: newInq, error } = await supabase.from('inquiries').insert(inquiryUpdateData).select().single();
          if (!error) {
            currentInquiryId = newInq.id;
            inquiry = newInq;
          }
        } else {
          await supabase.from('inquiries').update(inquiryUpdateData).eq('id', currentInquiryId);
        }
      } catch (dbErr) {
        console.error('❌ DB inquiry update error:', dbErr);
      }

      // Return response with matched therapists
      const response: ChatResponse = {
        reply: therapistListMessage,
        inquiryId: currentInquiryId || '',
        extractedInfo: {
          problem: extracted.problem || '',
          specialty: extracted.problem || '',
          schedule: extracted.preferred_time || '',
          insurance: extracted.insurance || '',
          patient_name: extracted.name || undefined,
          patient_email: extracted.email || undefined,
        },
        needsMoreInfo: false,
        matchedTherapists: matchedTherapists.map((t: any) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          bio: t.bio,
          specialties: t.specialties || [],
          accepted_insurance: t.accepted_insurance || [],
          google_calendar_id: t.google_calendar_id,
          google_refresh_token: t.google_refresh_token,
          is_active: t.is_active,
          created_at: t.created_at,
          updated_at: t.updated_at,
        })),
      };

      return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If no therapists found, inform user
    const noMatchMessage = `I'm sorry, I couldn't find any therapists that match your insurance (${extracted.insurance}) and specialty (${extracted.problem}). Please try again with different criteria.`;

    // Update inquiry with no match status
    const noMatchInquiryData: any = {
      problem_description: inquiry?.problem_description || message,
      requested_schedule: extracted.preferred_time || inquiry?.requested_schedule || null,
      insurance_info: extracted.insurance || inquiry?.insurance_info || null,
      extracted_specialty: extracted.problem || inquiry?.extracted_specialty || null,
      status: 'pending',
    };
    if (patientIdentifier) noMatchInquiryData.patient_identifier = patientIdentifier;

    try {
      if (!currentInquiryId) {
        const { data: newInq } = await supabase.from('inquiries').insert(noMatchInquiryData).select().single();
        if (newInq) currentInquiryId = newInq.id;
      } else {
        await supabase.from('inquiries').update(noMatchInquiryData).eq('id', currentInquiryId);
      }
    } catch (dbErr) {
      console.error('❌ DB inquiry update error:', dbErr);
    }

    const noMatchResponse: ChatResponse = {
      reply: noMatchMessage,
      inquiryId: currentInquiryId || '',
      extractedInfo: {
        problem: extracted.problem || '',
        specialty: extracted.problem || '',
        schedule: extracted.preferred_time || '',
        insurance: extracted.insurance || '',
        patient_name: extracted.name || undefined,
        patient_email: extracted.email || undefined,
      },
      needsMoreInfo: false,
      matchedTherapists: [],
    };

    return new Response(JSON.stringify(noMatchResponse), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('❌ Error in handle-chat:', error);
    const errorMessage = error?.message ? String(error.message) : 'An error occurred';
    return new Response(JSON.stringify({
      error: errorMessage,
      reply: 'I apologize, but I encountered a technical issue. Please try again in a moment.'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});
