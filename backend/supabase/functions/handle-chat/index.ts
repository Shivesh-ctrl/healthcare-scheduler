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
  "preferred_time": "<user-provided time or time range, e.g. '2025-12-14 15:00' or 'afternoons 3-5pm' or 'morning' or empty string>",
  "day_type": "<'weekday' or 'weekend' or specific day like 'monday' or empty string if not mentioned>",
  "email": "<email address or empty string>",
  "insurance": "<insurance provider name (e.g. 'BCBS', 'Blue Cross Blue Shield', 'Aetna') or empty string - DO NOT extract plan types like PPO/HMO>",
  "problem": "<the main problem/issue mentioned, e.g. 'stress', 'anxiety', 'depression' or empty string>"
}

If any field is not present in the message, set it to an empty string "". Do not invent extra fields. Do not extract insurance plan types (PPO, HMO, etc.) - only the insurance provider name.`;

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

// -------------------- AI reply generation (natural, empathetic responses) --------------------
async function generateAIResponse(
  userMessage: string,
  conversationHistory: any[] = [],
  extractedInfo: any = null,
  missingFields: string[] = [],
  isLoggedIn: boolean = false,
  matchedTherapists: any[] = [],
  userQueryType: string = '' // 'insurance', 'specialty', 'problem', 'general'
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

  // Build therapist info for AI
  let therapistInfo = '';
  if (matchedTherapists && matchedTherapists.length > 0) {
    therapistInfo = `\n\nMATCHED THERAPISTS (show these to the user naturally):\n`;
    matchedTherapists.forEach((t: any, idx: number) => {
      therapistInfo += `${idx + 1}. ${t.name}\n`;
      if (t.bio) therapistInfo += `   Bio: ${t.bio}\n`;
      if (t.specialties && Array.isArray(t.specialties)) {
        therapistInfo += `   Specialties: ${t.specialties.join(', ')}\n`;
      }
      therapistInfo += `\n`;
    });
  }

  // Build a natural, empathetic assistant prompt
  let prompt = `You are a warm, empathetic, and understanding scheduling assistant helping users book therapy appointments. Be human-like, compassionate, and supportive. Respond naturally as if you're having a real conversation.

CRITICAL RULES:
1. ALWAYS answer the user's question FIRST before asking for anything else
2. If the user asks about therapists (by insurance, specialty, problem), show them the matched therapists naturally
3. Be empathetic - acknowledge their situation, show understanding
4. Gather information naturally, one thing at a time - don't overwhelm with a long list
5. NEVER ask for information the user already provided
6. If user mentions crisis/emergency/suicidal thoughts, immediately provide:
   • 988 (Suicide & Crisis Lifeline - call or text)
   • Crisis Text Line: 741741
   • National Suicide Prevention Lifeline: 1-800-273-8255

User's current message: ${userMessage}

`;
  if (conversationContext) prompt += `Previous conversation:\n${conversationContext}\n\n`;

  // Add what we know about the user
  if (extractedInfo) {
    prompt += `Information we already have from the user:\n`;
    if (extractedInfo.problem) prompt += `- Problem/concern: ${extractedInfo.problem}\n`;
    if (extractedInfo.insurance) prompt += `- Insurance: ${extractedInfo.insurance}\n`;
    if (extractedInfo.name) prompt += `- Name: ${extractedInfo.name}\n`;
    if (extractedInfo.preferred_time) prompt += `- Preferred time: ${extractedInfo.preferred_time}\n`;
    if (extractedInfo.day_type) prompt += `- Day preference: ${extractedInfo.day_type}\n`;
    if (extractedInfo.email) prompt += `- Email: ${extractedInfo.email}\n`;
    prompt += `\n`;
  }

  // Add matched therapists if available
  if (therapistInfo) {
    prompt += therapistInfo;
    prompt += `\nIMPORTANT: Present these therapists naturally. Acknowledge what the user asked for, then show the therapists. Be warm and helpful.\n`;
  }

  // Determine what to do next
  if (matchedTherapists && matchedTherapists.length > 0) {
    // We have matched therapists - show them and then ask for missing info naturally
    if (missingFields && missingFields.length > 0) {
      const fieldsToAsk = isLoggedIn ? missingFields.filter(f => f !== 'email') : missingFields;
      const fieldMap: Record<string, string> = {
        'name': 'your name',
        'preferred_time': 'when you prefer appointments (morning, afternoon, evening)',
        'day_type': 'which days work best for you',
        'email': 'your email address',
        'insurance': 'your insurance provider'
      };
      
      prompt += `\nAfter showing the therapists, naturally ask for the missing information (${fieldsToAsk.map(f => fieldMap[f] || f).join(', ')}). 
      Ask ONE thing at a time, not all at once. Be conversational and empathetic.`;
    } else {
      prompt += `\nAll required information is present. Confirm naturally and ask if they'd like to book with one of these therapists.`;
    }
  } else if (missingFields && missingFields.length > 0) {
    // No therapists matched yet, but we need more info
    const fieldsToAsk = isLoggedIn ? missingFields.filter(f => f !== 'email') : missingFields;
    const fieldMap: Record<string, string> = {
      'name': 'your name',
      'preferred_time': 'when you prefer appointments (morning, afternoon, evening)',
      'day_type': 'which days work best for you',
      'email': 'your email address',
      'insurance': 'your insurance provider'
    };
    
    prompt += `\nThe user needs to provide: ${fieldsToAsk.map(f => fieldMap[f] || f).join(', ')}.
    Ask for ONE thing at a time naturally. Be empathetic and acknowledge what they've already shared.`;
  } else {
    prompt += `\nRespond naturally to the user's message. Be helpful and empathetic.`;
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

    // Load existing inquiry if provided (optional) - declare early to avoid scope issues
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

    // Check if user is asking for insurance list or therapist list - ULTRA AGGRESSIVE DETECTION
    const messageLower = message.toLowerCase().trim();
    
    // Check for insurance list requests - multiple patterns
    const hasList = messageLower.includes('list');
    const hasInsurance = messageLower.includes('insurance') || messageLower.includes('insurances');
    const hasShow = messageLower.includes('show');
    const hasWhat = messageLower.includes('what');
    const hasWhich = messageLower.includes('which');
    const hasAccepted = messageLower.includes('accepted');
    const hasAvailable = messageLower.includes('available');
    
    const askingForInsuranceList = 
      (hasList && hasInsurance) ||
      (hasInsurance && (hasList || hasShow || hasWhat || hasWhich || hasAccepted || hasAvailable)) ||
      messageLower.includes('what insurance') ||
      messageLower.includes('which insurance') ||
      messageLower.includes('accepted insurance') ||
      messageLower.includes('insurance provider') ||
      messageLower.match(/\b(list|show|what|which|accepted|available).*insurance\b/i) !== null ||
      messageLower.match(/\binsurance.*(list|show|what|which|accepted|available)\b/i) !== null;
    
    // Check for therapist list requests
    const hasTherapist = messageLower.includes('therapist') || messageLower.includes('therapists');
    const askingForTherapistList = 
      (hasList && hasTherapist) ||
      (hasTherapist && (hasList || hasShow || hasWhat || hasWhich || hasAvailable)) ||
      messageLower.includes('what therapist') ||
      messageLower.includes('which therapist') ||
      messageLower.includes('available therapist') ||
      messageLower.match(/\b(list|show|what|which|available).*therapist\b/i) !== null ||
      messageLower.match(/\btherapist.*(list|show|what|which|available)\b/i) !== null;
    
    console.log('🔍 Detection check:', { messageLower, askingForInsuranceList, askingForTherapistList });

    // Check if user is asking for therapists by specific insurance
    // Common insurance names
    const insuranceNames = ['aetna', 'blue cross', 'bluecross', 'bcbs', 'cigna', 'united', 'medicare', 'medicaid', 'humana'];
    let mentionedInsurance: string | null = null;
    for (const ins of insuranceNames) {
      if (messageLower.includes(ins)) {
        mentionedInsurance = ins;
        break;
      }
    }
    
    // Check if asking for therapists with insurance
    const askingForTherapistsByInsurance = 
      (hasTherapist && mentionedInsurance) ||
      (messageLower.includes('who') && mentionedInsurance && (hasTherapist || messageLower.includes('accept'))) ||
      (messageLower.includes('therapist') && messageLower.includes('accept') && mentionedInsurance) ||
      (messageLower.includes('therapist') && mentionedInsurance && (messageLower.includes('who') || messageLower.includes('that')));

    // If asking for therapists by insurance, provide them immediately
    if (askingForTherapistsByInsurance && mentionedInsurance) {
      console.log('🔍 User asking for therapists with insurance:', mentionedInsurance);
      
      // Get all therapists and filter by insurance
      const { data: allTherapists } = await supabase
        .from('therapists')
        .select('*')
        .eq('is_active', true);

      const insuranceLower = mentionedInsurance.toLowerCase();
      const matchingTherapists = (allTherapists || []).filter((therapist: any) => {
        if (!therapist.accepted_insurance || !Array.isArray(therapist.accepted_insurance)) return false;
        return therapist.accepted_insurance.some((ins: string) => 
          ins.toLowerCase().includes(insuranceLower) || 
          insuranceLower.includes(ins.toLowerCase())
        );
      });

      if (matchingTherapists && matchingTherapists.length > 0) {
        let therapistListMessage = `**Therapists Who Accept ${mentionedInsurance.charAt(0).toUpperCase() + mentionedInsurance.slice(1)} Insurance:**

I found ${matchingTherapists.length} therapist${matchingTherapists.length > 1 ? 's' : ''} who accept ${mentionedInsurance.charAt(0).toUpperCase() + mentionedInsurance.slice(1)}:\n\n`;

        matchingTherapists.forEach((therapist: any, index: number) => {
          therapistListMessage += `**${index + 1}. ${therapist.name}**\n`;
          if (therapist.bio) {
            therapistListMessage += `${therapist.bio}\n`;
          }
          if (Array.isArray(therapist.specialties) && therapist.specialties.length > 0) {
            therapistListMessage += `Specialties: ${therapist.specialties.join(', ')}\n`;
          }
          therapistListMessage += `\n`;
        });

        therapistListMessage += `**To get started, could you please share:**
• Your name
• What brings you in today?
• Your preferred time for appointments (morning, afternoon, or evening)
• What days of the week work best for you${patientIdentifier ? '' : '\n• Your email address (so I can send you appointment confirmations)'}`;

        // Update conversation history
        const newHistory = [
          ...(conversationHistory || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: therapistListMessage, timestamp: new Date().toISOString() },
        ];

        // Save inquiry with insurance info
        const inquiryData: any = {
          problem_description: message,
          insurance_info: mentionedInsurance,
          conversation_history: newHistory,
          status: 'pending',
        };
        if (patientIdentifier) inquiryData.patient_identifier = patientIdentifier;

        try {
          if (!currentInquiryId) {
            const { data: newInq } = await supabase.from('inquiries').insert(inquiryData).select().single();
            if (newInq) currentInquiryId = newInq.id;
      } else {
            await supabase.from('inquiries').update(inquiryData).eq('id', currentInquiryId);
          }
        } catch (dbErr) {
          console.error('❌ DB inquiry save error:', dbErr);
        }

        const response: ChatResponse = {
          reply: therapistListMessage,
          inquiryId: currentInquiryId || '',
          extractedInfo: undefined,
          needsMoreInfo: true,
          matchedTherapists: undefined,
        };

        return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
        // No therapists found for this insurance
        const noMatchMessage = `I'm sorry, but I couldn't find any therapists who accept ${mentionedInsurance.charAt(0).toUpperCase() + mentionedInsurance.slice(1)} insurance at this time.

**Accepted Insurance Providers:**
• Blue Cross Blue Shield
• Aetna
• Cigna
• United
• Medicare
• Medicaid
• Humana

Would you like to see therapists who accept a different insurance plan, or would you like to proceed with one of the accepted insurances listed above?`;

        const newHistory = [
          ...(conversationHistory || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: noMatchMessage, timestamp: new Date().toISOString() },
        ];

        const inquiryData: any = {
          problem_description: message,
          insurance_info: mentionedInsurance,
          conversation_history: newHistory,
          status: 'pending',
        };
        if (patientIdentifier) inquiryData.patient_identifier = patientIdentifier;

        try {
          if (!currentInquiryId) {
            const { data: newInq } = await supabase.from('inquiries').insert(inquiryData).select().single();
            if (newInq) currentInquiryId = newInq.id;
          } else {
            await supabase.from('inquiries').update(inquiryData).eq('id', currentInquiryId);
          }
        } catch (dbErr) {
          console.error('❌ DB inquiry save error:', dbErr);
        }

        const response: ChatResponse = {
          reply: noMatchMessage,
          inquiryId: currentInquiryId || '',
          extractedInfo: undefined,
          needsMoreInfo: true,
          matchedTherapists: undefined,
        };

        return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // If asking for insurance list, provide it immediately
    if (askingForInsuranceList) {
      // Get all unique insurance types from therapists
      const { data: allTherapists } = await supabase
        .from('therapists')
        .select('accepted_insurance')
        .eq('is_active', true);

      const allInsurances = new Set<string>();
      if (allTherapists) {
        allTherapists.forEach((t: any) => {
          if (Array.isArray(t.accepted_insurance)) {
            t.accepted_insurance.forEach((ins: string) => {
              allInsurances.add(ins);
            });
          }
        });
      }

      const insuranceList = Array.from(allInsurances).sort().join(', ');
      
      const insuranceListMessage = `**Accepted Insurance Providers:**

We accept the following insurance plans:

${Array.from(allInsurances).sort().map(ins => `• **${ins.charAt(0).toUpperCase() + ins.slice(1)}**`).join('\n')}

All our therapists accept these insurance plans, so you can choose any therapist that matches your needs!

**To get started, could you please share:**
• Your name
• Your insurance provider (from the list above)
• Your preferred time for appointments (morning, afternoon, or evening)
• What days of the week work best for you${patientIdentifier ? '' : '\n• Your email address (so I can send you appointment confirmations)'}`;

      // Update conversation history
      const newHistory = [
        ...(conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: insuranceListMessage, timestamp: new Date().toISOString() },
      ];

      // Save inquiry
      const inquiryData: any = {
        problem_description: message,
        conversation_history: newHistory,
        status: 'pending',
      };
      if (patientIdentifier) inquiryData.patient_identifier = patientIdentifier;

      try {
        if (!currentInquiryId) {
          const { data: newInq } = await supabase.from('inquiries').insert(inquiryData).select().single();
          if (newInq) currentInquiryId = newInq.id;
                } else {
          await supabase.from('inquiries').update(inquiryData).eq('id', currentInquiryId);
        }
      } catch (dbErr) {
        console.error('❌ DB inquiry save error:', dbErr);
      }

      const response: ChatResponse = {
        reply: insuranceListMessage,
        inquiryId: currentInquiryId || '',
        extractedInfo: undefined,
        needsMoreInfo: true,
        matchedTherapists: undefined,
      };

      return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If asking for therapist list, provide it immediately
    if (askingForTherapistList) {
      const { data: allTherapists } = await supabase
        .from('therapists')
        .select('*')
        .eq('is_active', true);

      if (allTherapists && allTherapists.length > 0) {
        let therapistListMessage = `**Available Therapists:**

We have ${allTherapists.length} experienced therapists available:\n\n`;

        allTherapists.forEach((therapist: any, index: number) => {
          therapistListMessage += `**${index + 1}. ${therapist.name}**\n`;
          if (therapist.bio) {
            therapistListMessage += `${therapist.bio.substring(0, 150)}...\n`;
          }
          if (Array.isArray(therapist.specialties) && therapist.specialties.length > 0) {
            therapistListMessage += `Specialties: ${therapist.specialties.slice(0, 3).join(', ')}\n`;
          }
          therapistListMessage += `\n`;
        });

        therapistListMessage += `**To get started, could you please share:**
• Your name
• Your insurance provider
• Your preferred time for appointments (morning, afternoon, or evening)
• What days of the week work best for you${patientIdentifier ? '' : '\n• Your email address (so I can send you appointment confirmations)'}`;

        // Update conversation history
        const newHistory = [
          ...(conversationHistory || []),
      { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: therapistListMessage, timestamp: new Date().toISOString() },
    ];

        // Save inquiry
    const inquiryData: any = {
          problem_description: message,
      conversation_history: newHistory,
          status: 'pending',
        };
        if (patientIdentifier) inquiryData.patient_identifier = patientIdentifier;

        try {
          if (!currentInquiryId) {
            const { data: newInq } = await supabase.from('inquiries').insert(inquiryData).select().single();
            if (newInq) currentInquiryId = newInq.id;
                } else {
            await supabase.from('inquiries').update(inquiryData).eq('id', currentInquiryId);
          }
        } catch (dbErr) {
          console.error('❌ DB inquiry save error:', dbErr);
        }

        const response: ChatResponse = {
          reply: therapistListMessage,
          inquiryId: currentInquiryId || '',
          extractedInfo: undefined,
          needsMoreInfo: true,
          matchedTherapists: undefined,
        };

        return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // Load existing extracted info from inquiry if available
    if (inquiry) {
      extracted.name = inquiry.patient_name || extracted.name || '';
      extracted.email = inquiry.patient_email || extracted.email || '';
      extracted.preferred_time = inquiry.requested_schedule || extracted.preferred_time || '';
      extracted.insurance = inquiry.insurance_info || extracted.insurance || '';
      extracted.problem = inquiry.extracted_specialty || extracted.problem || '';
    }

    try {
      const newExtracted = await extractAppointmentInfoWithAI(message, conversationHistory);
      // Merge with existing data (new data takes precedence)
      extracted = {
        name: newExtracted.name || extracted.name,
        preferred_time: newExtracted.preferred_time || extracted.preferred_time,
        day_type: newExtracted.day_type || extracted.day_type,
        email: newExtracted.email || extracted.email,
        insurance: newExtracted.insurance || extracted.insurance,
        problem: newExtracted.problem || extracted.problem,
      };
      // normalize day_type
      extracted.day_type = normalizeDayType(extracted.day_type);
      console.log('✅ Extracted appointment info:', extracted);
    } catch (err: any) {
      console.error('❌ Extraction failed:', err);
      // Keep existing extracted data if extraction fails
    }

    // 2) Check if user is asking a specific question - find therapists FIRST if they are
    let matchedTherapists: any[] = [];
    let userQueryType = '';
    
    // Normalize insurance for matching
    const normalizeInsurance = (ins: string): string => {
      if (!ins) return '';
      const normalized = ins.toLowerCase().trim();
      if (normalized.includes('blue cross') || normalized.includes('bcbs') || normalized.includes('bluecross')) {
        return 'blue cross blue shield';
      }
      if (normalized.includes('aetna')) return 'aetna';
      if (normalized.includes('cigna')) return 'cigna';
      if (normalized.includes('united') && normalized.includes('health')) return 'united';
      if (normalized.includes('medicare')) return 'medicare';
      if (normalized.includes('medicaid')) return 'medicaid';
      if (normalized.includes('humana')) return 'humana';
      return normalized;
    };

    // Check if user is asking about therapists by insurance, specialty, or problem
    // messageLower already declared above
    const hasInsuranceQuery = extracted.insurance && extracted.insurance.trim() !== '';
    const hasProblemQuery = extracted.problem && extracted.problem.trim() !== '';
    
    // If user mentioned insurance or problem, find matching therapists immediately
    if (hasInsuranceQuery || hasProblemQuery) {
      console.log('🔍 User asking about therapists - finding matches...');
      
      const { data: allTherapists } = await supabase
        .from('therapists')
        .select('*')
        .eq('is_active', true);

      if (allTherapists && allTherapists.length > 0) {
        const insuranceNormalized = hasInsuranceQuery ? normalizeInsurance(extracted.insurance) : '';
        const problemLower = hasProblemQuery ? extracted.problem.toLowerCase().trim() : '';

        matchedTherapists = allTherapists.filter((therapist: any) => {
          // If insurance mentioned, must match insurance
          if (hasInsuranceQuery) {
            const hasInsurance = therapist.accepted_insurance && 
              Array.isArray(therapist.accepted_insurance) &&
              therapist.accepted_insurance.some((ins: string) => {
                const insNormalized = normalizeInsurance(ins);
                return insNormalized.includes(insuranceNormalized) || 
                     insuranceNormalized.includes(insNormalized);
              });
            if (!hasInsurance) return false;
          }

          // If problem/specialty mentioned, must match specialty
          if (hasProblemQuery) {
            const hasSpecialty = therapist.specialties && 
              Array.isArray(therapist.specialties) &&
              therapist.specialties.some((s: string) => 
                s.toLowerCase().includes(problemLower) || 
                problemLower.includes(s.toLowerCase())
              );
            const bioMatch = therapist.bio && 
              therapist.bio.toLowerCase().includes(problemLower);
            if (!hasSpecialty && !bioMatch) return false;
          }

          // If only insurance or only problem, return true if that matches
          return true;
        });

        // Limit to top 5 matches
        matchedTherapists = matchedTherapists.slice(0, 5);
        console.log(`✅ Found ${matchedTherapists.length} matching therapists`);
        
        if (hasInsuranceQuery && hasProblemQuery) userQueryType = 'both';
        else if (hasInsuranceQuery) userQueryType = 'insurance';
        else if (hasProblemQuery) userQueryType = 'specialty';
      }
    }

    // 3) Determine required fields
    const requiresEmail = !patientIdentifier;
    const requiredFields = ['name', 'preferred_time', 'day_type', 'insurance'] as const;
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!extracted[field] || extracted[field].toString().trim() === '') missingFields.push(field);
    }
    if (requiresEmail && (!extracted.email || extracted.email.trim() === '')) missingFields.push('email');

    // 4) If missing fields, ask for them (do not book yet)
    if (missingFields.length > 0) {
      const aiResponse = await generateAIResponse(
        message, 
        conversationHistory, 
        extracted, 
        missingFields, 
        !!patientIdentifier,
        matchedTherapists,
        userQueryType
      );

      // Update inquiry conversation history with assistant follow-up
      const newHistory = [
        ...(conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() },
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
        reply: aiResponse,
        inquiryId: currentInquiryId || '',
        extractedInfo: {
          problem: extracted.problem || '',
          specialty: extracted.problem || '',
          schedule: extracted.preferred_time || '',
          insurance: extracted.insurance || '',
          patient_name: extracted.name || undefined,
          patient_email: extracted.email || undefined,
        },
        needsMoreInfo: true,
        matchedTherapists: matchedTherapists.length > 0 ? matchedTherapists.map((t: any) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          bio: t.bio,
          specialties: t.specialties || [],
          accepted_insurance: t.accepted_insurance || [],
          google_calendar_id: t.google_calendar_id || null,
          google_refresh_token: t.google_refresh_token || null,
          is_active: t.is_active !== undefined ? t.is_active : true,
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString(),
        })) : undefined,
      };

      return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 5) All required info present -> find matching therapists if not already found
    if (matchedTherapists.length === 0) {
      console.log('🔍 Finding matching therapists with all criteria...');
      
      const insuranceNormalized = normalizeInsurance(extracted.insurance);
      const problemLower = extracted.problem.toLowerCase().trim();

      const { data: allTherapists } = await supabase
        .from('therapists')
        .select('*')
        .eq('is_active', true);

      if (allTherapists && allTherapists.length > 0) {
        matchedTherapists = allTherapists.filter((therapist: any) => {
          const hasInsurance = therapist.accepted_insurance && 
            Array.isArray(therapist.accepted_insurance) &&
            therapist.accepted_insurance.some((ins: string) => {
              const insNormalized = normalizeInsurance(ins);
              return insNormalized.includes(insuranceNormalized) || 
                   insuranceNormalized.includes(insNormalized);
            });

          const hasSpecialty = therapist.specialties && 
            Array.isArray(therapist.specialties) &&
            therapist.specialties.some((s: string) => 
              s.toLowerCase().includes(problemLower) || 
              problemLower.includes(s.toLowerCase())
            );

          const bioMatch = therapist.bio && 
            therapist.bio.toLowerCase().includes(problemLower);

          return hasInsurance && (hasSpecialty || bioMatch);
        });

        matchedTherapists = matchedTherapists.slice(0, 3);
        console.log(`✅ Found ${matchedTherapists.length} matching therapists`);
      }
    }

    // If we have matched therapists, show them using AI-generated response
    if (matchedTherapists.length > 0) {
      const aiResponse = await generateAIResponse(
        message,
        conversationHistory,
        extracted,
        [],
        !!patientIdentifier,
        matchedTherapists,
        'matched'
      );

      // Update conversation history
      const newHistory = [
        ...(conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: therapistListMessage, timestamp: new Date().toISOString() },
      ];

      // Update inquiry - save patient details for booking
            const inquiryUpdateData: any = {
        problem_description: inquiry?.problem_description || message,
        requested_schedule: extracted.preferred_time || inquiry?.requested_schedule || null,
        insurance_info: extracted.insurance || inquiry?.insurance_info || null,
        extracted_specialty: extracted.problem || inquiry?.extracted_specialty || null,
        conversation_history: newHistory,
        status: 'matched',
        patient_name: extracted.name || inquiry?.patient_name || null,
        patient_email: extracted.email || inquiry?.patient_email || null,
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
