// @ts-ignore - Deno HTTP imports are valid in Supabase Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { generateAIResponse } from '../_shared/ai-provider.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import type { ChatRequest, ChatResponse, ConversationMessage, ExtractedInfo } from '../_shared/types.ts';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize insurance names to handle variations
 */
function normalizeInsurance(insurance: string): string {
  const normalized = insurance.toLowerCase().trim();
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
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate date format (YYYY-MM-DD) and ensure it's in the future
 */
function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date > today && !isNaN(date.getTime());
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(timeStr: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

/**
 * Clean AI response: Remove therapist names and location questions before matching
 */
function cleanAIResponse(response: string, hasMatchedTherapists: boolean): string {
  if (hasMatchedTherapists) {
    // If we have matched therapists, only remove location questions
    response = response.replace(/Are you looking for (virtual|in-person) or (in-person|virtual) (appointments|sessions)\?/gi, '');
    response = response.replace(/Are you looking for in-person or (virtual|telehealth)/gi, '');
    response = response.replace(/therapy\s+sessions\?/gi, '');
    response = response.replace(/What state are you located in\?/gi, '');
    response = response.replace(/Your location:\s*\(City,\s*State\)/gi, '');
    response = response.replace(/This is crucial for finding therapists in your (BCBS|network)/gi, '');
    return response.trim();
  }

  // If no matched therapists yet, remove ALL therapist names and location questions
  console.log('🧹 Cleaning response: Removing therapist names and location questions');

  // List of all therapist names to remove
  const therapistNames = [
    'Jasmine Goins, LCSW', 'Jasmine Goins',
    'Rachel Kurt, LCPC', 'Rachel Kurt',
    'Tykisha Bays, LSW, CADC', 'Tykisha Bays',
    'Adriane Wilk, LCPC', 'Adriane Wilk',
    'Joy Banks, LCPC', 'Joy Banks',
    'Ebony Norwood, LCSW', 'Ebony Norwood',
    'Porsche McGee, LSW', 'Porsche McGee',
    'Aakruti Patel, LCPC', 'Aakruti Patel',
    'Erica Rodriguez, LCSW', 'Erica Rodriguez',
    'Brianna Smith, LCPC', 'Brianna Smith',
    'Adrienne Farmer, LCSW', 'Adrienne Farmer',
    'Alicia Muhammad, LCSW', 'Alicia Muhammad',
    'Porsche White, LCSW', 'Porsche White',
    'Alexia Sula, LCSW', 'Alexia Sula',
  ];

  // Remove concatenated names (e.g., "haveJasmine Goins")
  response = response.replace(/([a-z])(Jasmine\s+Goins(?:\s*,\s*LCSW)?)/gi, '$1');
  response = response.replace(/(Jasmine\s+Goins(?:\s*,\s*LCSW)?)([A-Z])/gi, '$2');
  response = response.replace(/(Jasmine\s+Goins(?:\s*,\s*LCSW)?)(Jasmine\s+Goins(?:\s*,\s*LCSW)?)/gi, '');

  // Remove all therapist names (3 passes to catch everything)
  for (let pass = 0; pass < 3; pass++) {
    for (const name of therapistNames) {
      const pattern = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      response = response.replace(pattern, '');
    }
  }

  // Remove location questions - ULTRA AGGRESSIVE
  response = response.replace(/Are you looking for (virtual|in-person) or (in-person|virtual) (appointments|sessions)\?/gi, '');
  response = response.replace(/Are you looking for in-person or (virtual|telehealth)/gi, '');
  response = response.replace(/therapy\s+sessions\?/gi, '');
  response = response.replace(/What state are you located in\?/gi, '');
  response = response.replace(/What state are you in\?/gi, '');
  response = response.replace(/What state do you live in\?/gi, '');
  response = response.replace(/What (state|city) are you (located in|in|live in)\?/gi, '');
  response = response.replace(/Your location:\s*\(City,\s*State\)/gi, '');
  response = response.replace(/Your location\s*\(City,\s*State\)/gi, '');
  response = response.replace(/This is crucial for finding therapists in your (BCBS|network)/gi, '');
  response = response.replace(/This is important for finding therapists licensed in your state/gi, '');
  response = response.replace(/This is important for insurance coverage/gi, '');
  response = response.replace(/Before I start searching for therapists, could you confirm the following:/gi, '');
  response = response.replace(/Before I start searching, could you confirm:/gi, '');
  response = response.replace(/I still need to know.*state.*live in/gi, '');
  response = response.replace(/To find the best therapist, I still need to know.*state/gi, '');
  
  // Remove insurance plan type questions
  response = response.replace(/Do you have a specific type of (BCBS|Aetna|Cigna|insurance) plan\s*\(e\.g\.,\s*PPO,\s*HMO/gi, '');
  response = response.replace(/What specific (BCBS|Aetna|Cigna|insurance) plan do you have/gi, '');
  response = response.replace(/Do you know what specific (BCBS|Aetna|Cigna|insurance) plan you have/gi, '');
  response = response.replace(/This information is usually on your insurance card/gi, '');
  response = response.replace(/This information is on your insurance card/gi, '');
  
  // Remove bullet points about location and insurance plan
  response = response.replace(/\*\s*Your location[^\n]*\n/gi, '');
  response = response.replace(/•\s*Your location[^\n]*\n/gi, '');
  response = response.replace(/-\s*Your location[^\n]*\n/gi, '');
  response = response.replace(/\d+\.\s*What state do you live in\?[^\n]*\n/gi, '');
  response = response.replace(/\d+\.\s*Do you have a specific type of[^\n]*plan[^\n]*\n/gi, '');

  // Fix empty placeholders
  response = response.replace(/what you're looking for in\s+\?/gi, 'what you\'re looking for in a therapist?');
  response = response.replace(/looking for in\s+\?/gi, 'looking for in a therapist?');
  response = response.replace(/Are you looking for\s+with/gi, 'Are you looking for a therapist with');
  response = response.replace(/preference for\s+'s\s+gender/gi, 'preference for a therapist\'s gender');
  response = response.replace(/therapist's\s+,/gi, 'therapist\'s gender,');
  response = response.replace(/therapist's\s+age/gi, 'therapist\'s gender, age');
  response = response.replace(/have\s*\(BCBS\)/gi, 'have BCBS');
  response = response.replace(/\(e\.g\.,\s+CBT,\s+mindfulness-based therapy in CBT/gi, '(e.g., CBT, mindfulness-based therapy');

  // Fix formatting
  response = response.replace(/\s*,\s*,/g, ',');
  response = response.replace(/\s{2,}/g, ' ');
  response = response.replace(/\n{3,}/g, '\n\n');

  // Final pass - remove any remaining name patterns
  response = response.replace(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s*,\s*(LCSW|LCPC|LSW|CADC|LPC)\b/gi, '');
  response = response.replace(/\bJasmine\s+Goins\b/gi, '');

  return response.trim();
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  console.log('🚀 handle-chat function called');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      statusText: 'No Content',
      headers: corsHeaders 
    });
  }

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse request
    const { message, inquiryId, conversationHistory = [] }: ChatRequest = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Get authenticated user email if available
    let authenticatedUserEmail: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.email) {
          authenticatedUserEmail = user.email;
          console.log('✅ Authenticated user:', authenticatedUserEmail);
        }
      }
    } catch (err) {
      console.log('ℹ️ No authenticated user');
    }

    // Load or create inquiry
    let currentInquiryId = inquiryId;
    let inquiry: any = null;

    if (currentInquiryId) {
      const { data } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', currentInquiryId)
        .single();
      inquiry = data;
    }

    // Fetch all active therapists for matching
    const { data: allTherapists, error: therapistsError } = await supabase
      .from('therapists')
      .select('*')
      .eq('is_active', true);

    if (therapistsError) {
      console.error('❌ Error fetching therapists:', therapistsError);
    }

    const allActiveTherapists = allTherapists || [];

    // Build therapist list for AI system prompt
    let therapistListForAI = '**AVAILABLE THERAPISTS (ONLY USE THESE NAMES AFTER MATCHING):**\n\n';
    if (allActiveTherapists.length > 0) {
      allActiveTherapists.forEach((t: any) => {
        const specialties = Array.isArray(t.specialties) ? t.specialties.join(', ') : 'General';
        const insurance = Array.isArray(t.accepted_insurance) ? t.accepted_insurance.join(', ') : 'Various';
        therapistListForAI += `- ${t.name}\n`;
        therapistListForAI += `  Specialties: ${specialties}\n`;
        therapistListForAI += `  Insurance: ${insurance}\n`;
        if (t.bio) therapistListForAI += `  Bio: ${t.bio.substring(0, 200)}...\n`;
        therapistListForAI += '\n';
      });
    } else {
      therapistListForAI += 'No therapists available.\n';
    }

    // Get current date for context
    const now = new Date();
    const currentDateStr = now.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const istDateParts = now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/');
    const currentDateISO = `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}`;

    // Build system prompt
    const systemPrompt = `${therapistListForAI}

**YOUR ROLE:** You are a warm, empathetic healthcare scheduling assistant helping people find therapists.

**🚨 ABSOLUTE RULES - NEVER BREAK THESE 🚨**

**1. NEVER MENTION ANY THERAPIST NAME UNTIL AFTER YOU HAVE MATCHED THERAPISTS**
   - DON'T say: "Jasmine Goins, LCSW" or any therapist name
   - DON'T say: "haveJasmine Goins" or concatenated names
   - DO say: "a therapist" or "the right therapist"
   - DO say: "have BCBS insurance" NOT "haveJasmine Goins, LCSW (BCBS)"

**2. NEVER ASK ABOUT LOCATION - ALL SESSIONS ARE VIRTUAL/ONLINE ONLY**
   - DON'T ask: "What is your zip code?"
   - DON'T ask: "What state are you located in?"
   - DON'T ask: "What state do you live in?"
   - DON'T ask: "Your location: (City, State)"
   - DON'T ask: "Are you looking for in-person or telehealth?"
   - DON'T ask: "therapy sessions?" (empty placeholder)
   - DON'T say: "This is crucial for finding therapists in your BCBS network"
   - DON'T say: "This is important for finding therapists licensed in your state"
   - DON'T say: "Before I start searching for therapists, could you confirm the following:"
   - ALL sessions are virtual/online - NEVER ask about this
   - Insurance coverage does NOT depend on location
   - Therapists are licensed for virtual sessions - location is irrelevant

**3. NEVER ASK FOR SPECIFIC INSURANCE PLAN DETAILS**
   - DON'T ask: "Do you have a specific type of BCBS plan (e.g., PPO, HMO)?"
   - DON'T ask: "What specific BCBS plan do you have?"
   - DON'T ask: "Do you know what specific BCBS plan you have?"
   - Once user mentions insurance (e.g., "BCBS", "Aetna"), ACKNOWLEDGE it and move on
   - DO say: "Thanks for sharing that you have BCBS insurance"
   - DO NOT ask for plan type details - just acknowledge the insurance name

**4. WHEN GIVING EXAMPLES, ONLY USE THERAPY TYPE NAMES**
   - DON'T say: "Jasmine Goins, LCSW - specializes in CBT"
   - DO say: "CBT" or "mindfulness-based therapy"
   - Examples: "(e.g., CBT, DBT, psychodynamic therapy)"

**5. WHEN ASKING ABOUT PREFERENCES, USE GENERIC TERMS**
   - DON'T say: "preferences for Jasmine Goins, LCSW's gender"
   - DO say: "preferences for a therapist's gender"

**BEFORE MATCHING - COLLECT THIS INFO:**
1. What brings them in? (anxiety, depression, etc.)
2. What insurance do they have? (Aetna, BCBS, etc.)
3. When are they available? (weekends, mornings, etc.)
4. Any preferences? (therapist's gender, therapy type like CBT)

**QUESTIONS TO ASK (USE THESE EXACT FORMATS):**
- "What brings you in today?"
- "What insurance do you have?"
- "What are your scheduling preferences?"
- "Are there any specific approaches to therapy you're interested in? (e.g., CBT, mindfulness-based therapy, psychodynamic therapy)"
- "Do you have any preferences for a therapist's gender, age, or background?"

**EMERGENCY:** If user mentions suicide/self-harm, immediately provide: 988 (call/text), Crisis Text Line 741741, 1-800-273-8255.

**EXTRACTION RULES:**
- Extract insurance: "blue cross"/"bcbs"→"blue cross blue shield", "aetna", "cigna", "united", "medicare", "medicaid", "humana"
- Extract dates: Accept any format, convert to YYYY-MM-DD (future dates only)
- Extract times: "10am"→"10:00", "2pm"→"14:00", "morning"→"09:00"
- Today's date: ${currentDateStr} (${currentDateISO}) - use for calculating "next Friday" etc.

**OUTPUT FORMAT:**
When you extract information, output it as JSON:
EXTRACTED_INFO: {"problem":"depression","specialty":"depression","insurance":"blue cross blue shield","schedule":"weekdays"}

When you have ALL required booking info (therapist name, patient name, email, date, time), output:
BOOKING_INFO: {"therapist_name":"Adriane Wilk, LCPC","patient_name":"John Doe","patient_email":"john@example.com","appointment_date":"2025-12-10","appointment_time":"10:00"}

**ONLY AFTER you have their problem AND insurance, THEN show matched therapists with names.**
**BEFORE that, use generic phrases like "the right therapist" or "a therapist" - NEVER use actual therapist names.**`;

    // Build conversation history for AI
    const aiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: ConversationMessage) => {
        if (msg.role === 'user') {
          aiMessages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          aiMessages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

    // Add current message
    aiMessages.push({ role: 'user', content: message });

    // Generate AI response
    console.log('🤖 Generating AI response...');
    let aiResponse: string;
    try {
      aiResponse = await generateAIResponse(aiMessages, 'google');
      console.log('✅ AI response generated');
    } catch (error: any) {
      console.error('❌ Error generating AI response:', error);
      throw new Error(`AI service error: ${error.message || 'Unknown error'}`);
    }

    // Parse EXTRACTED_INFO and BOOKING_INFO from AI response
    let extractedInfo: Partial<ExtractedInfo> | undefined;
    let bookingInfo: any = undefined;
    let cleanResponse = aiResponse;

    // Extract EXTRACTED_INFO
    const extractedMatch = aiResponse.match(/EXTRACTED_INFO:\s*\{[^}]+\}/);
    if (extractedMatch) {
      try {
        const jsonStr = extractedMatch[0].replace('EXTRACTED_INFO:', '').trim();
        extractedInfo = JSON.parse(jsonStr);
        console.log('📋 Extracted info:', extractedInfo);
        cleanResponse = cleanResponse.replace(/EXTRACTED_INFO:\s*\{[^}]+\}/g, '').trim();
      } catch (e) {
        console.error('❌ Failed to parse EXTRACTED_INFO:', e);
      }
    }

    // Extract BOOKING_INFO
    const bookingMatch = aiResponse.match(/BOOKING_INFO:\s*\{[^}]+\}/);
    if (bookingMatch) {
      try {
        const jsonStr = bookingMatch[0].replace('BOOKING_INFO:', '').trim();
        bookingInfo = JSON.parse(jsonStr);
        console.log('📅 Booking info:', bookingInfo);
        cleanResponse = cleanResponse.replace(/BOOKING_INFO:\s*\{[^}]+\}/g, '').trim();
      } catch (e) {
        console.error('❌ Failed to parse BOOKING_INFO:', e);
      }
    }

    // Match therapists if we have enough info
    let matchedTherapists: any[] | undefined = undefined;
    const needsMoreInfo = !extractedInfo || !extractedInfo.specialty || !extractedInfo.insurance;

    if (!needsMoreInfo && extractedInfo && extractedInfo.specialty && extractedInfo.insurance) {
      const specialtyLower = extractedInfo.specialty.toLowerCase().trim();
      const insuranceNormalized = normalizeInsurance(extractedInfo.insurance);

      // Filter therapists
      matchedTherapists = allActiveTherapists.filter((therapist: any) => {
        const hasSpecialty = therapist.specialties && 
          Array.isArray(therapist.specialties) &&
          therapist.specialties.some((s: string) => 
            s.toLowerCase().includes(specialtyLower) || 
            specialtyLower.includes(s.toLowerCase())
          );
        
        const hasInsurance = therapist.accepted_insurance && 
          Array.isArray(therapist.accepted_insurance) &&
          therapist.accepted_insurance.some((ins: string) => {
            const insNormalized = normalizeInsurance(ins);
            return insNormalized.includes(insuranceNormalized) || 
                   insuranceNormalized.includes(insNormalized);
          });

        return hasSpecialty && hasInsurance;
      });

      // Sort by relevance (limit to 3)
      if (matchedTherapists && matchedTherapists.length > 0) {
        matchedTherapists = matchedTherapists.slice(0, 3);
        console.log(`✅ Found ${matchedTherapists.length} matching therapists`);
      }
    }

    // Clean AI response (remove therapist names and location questions)
    cleanResponse = cleanAIResponse(cleanResponse, matchedTherapists !== undefined && matchedTherapists.length > 0);

    // Update conversation history
    const newHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: cleanResponse, timestamp: new Date().toISOString() }
    ];

    // Save or update inquiry
    const inquiryData: any = {
      conversation_history: newHistory,
    };

    if (extractedInfo) {
      if (extractedInfo.insurance) inquiryData.insurance_info = extractedInfo.insurance;
      if (extractedInfo.schedule) inquiryData.requested_schedule = extractedInfo.schedule;
      if (extractedInfo.specialty) inquiryData.extracted_specialty = extractedInfo.specialty;
      if (extractedInfo.patient_name) inquiryData.patient_name = extractedInfo.patient_name;
      if (extractedInfo.patient_email) inquiryData.patient_email = extractedInfo.patient_email;
      if (extractedInfo.patient_phone) inquiryData.patient_phone = extractedInfo.patient_phone;
    }

    // Add authenticated user email if available
    if (authenticatedUserEmail && !inquiryData.patient_email) {
      inquiryData.patient_email = authenticatedUserEmail;
    }

    if (!currentInquiryId) {
      inquiryData.problem_description = message;
      const { data: newInquiry, error } = await supabase
        .from('inquiries')
        .insert(inquiryData)
        .select()
        .single();

      if (error) throw error;
      currentInquiryId = newInquiry.id;
      inquiry = newInquiry;
      console.log('✅ Created new inquiry:', currentInquiryId);
    } else {
      const { data: updatedInquiry, error } = await supabase
        .from('inquiries')
        .update(inquiryData)
        .eq('id', currentInquiryId)
        .select()
        .single();

      if (error) throw error;
      inquiry = updatedInquiry;
      console.log('✅ Updated inquiry:', currentInquiryId);
    }

    // Update inquiry with matched therapist if we have matches
    if (matchedTherapists && matchedTherapists.length > 0 && !inquiry.matched_therapist_id) {
      await supabase
        .from('inquiries')
        .update({ 
          matched_therapist_id: matchedTherapists[0].id,
          status: 'matched'
        })
        .eq('id', currentInquiryId);
    }

    // Process booking if we have all required info
    if (bookingInfo && 
        bookingInfo.therapist_name && 
        bookingInfo.patient_name && 
        isValidEmail(bookingInfo.patient_email || authenticatedUserEmail || '') &&
        isValidDate(bookingInfo.appointment_date) &&
        isValidTime(bookingInfo.appointment_time)) {
      
      console.log('📅 Processing booking...');
      
      // Find therapist by name
      const selectedTherapist = allActiveTherapists.find((t: any) => 
        t.name.toLowerCase() === bookingInfo.therapist_name.toLowerCase()
      );

      if (selectedTherapist) {
        try {
          // Call book-appointment function
          const bookResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/book-appointment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              therapistId: selectedTherapist.id,
              inquiryId: currentInquiryId,
              startTime: `${bookingInfo.appointment_date}T${bookingInfo.appointment_time}:00`,
              patientInfo: {
                name: bookingInfo.patient_name,
                email: bookingInfo.patient_email || authenticatedUserEmail,
                phone: bookingInfo.patient_phone || null,
              }
            })
          });

          if (bookResponse.ok) {
            const bookingResult = await bookResponse.json();
            console.log('✅ Appointment booked:', bookingResult);
            
            // Update inquiry status
            await supabase
              .from('inquiries')
              .update({ status: 'scheduled' })
              .eq('id', currentInquiryId);

            // Update response with booking confirmation
            cleanResponse = `✅ **Appointment Booked Successfully!**\n\n`;
            cleanResponse += `Your appointment has been confirmed.\n\n`;
            cleanResponse += `📅 **Date:** ${new Date(`${bookingInfo.appointment_date}T${bookingInfo.appointment_time}`).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
            cleanResponse += `⏰ **Time:** ${new Date(`${bookingInfo.appointment_date}T${bookingInfo.appointment_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}\n`;
            cleanResponse += `👤 **Therapist:** ${selectedTherapist.name}\n`;
            cleanResponse += `📧 **Confirmation sent to:** ${bookingInfo.patient_email || authenticatedUserEmail}\n`;
          } else {
            const errorText = await bookResponse.text();
            console.error('❌ Booking failed:', errorText);
            cleanResponse += `\n\n⚠️ I encountered an error while booking: ${errorText}. Please try again.`;
          }
        } catch (error: any) {
          console.error('❌ Booking error:', error);
          cleanResponse += `\n\n⚠️ I encountered an error while booking: ${error.message}. Please try again.`;
        }
      }
    }

    // Final cleanup pass (right before returning)
    cleanResponse = cleanAIResponse(cleanResponse, matchedTherapists !== undefined && matchedTherapists.length > 0);

    // Build response
    const response: ChatResponse = {
      reply: cleanResponse,
      inquiryId: currentInquiryId || '',
      extractedInfo,
      needsMoreInfo,
      matchedTherapists: matchedTherapists || undefined,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error in handle-chat:', error);
    
    let errorMessage = 'An error occurred';
    if (error?.message) {
      errorMessage = String(error.message);
    }

    // Provide helpful error messages
    if (errorMessage.includes('quota') || errorMessage.includes('capacity')) {
      errorMessage = 'AI service is temporarily at capacity. Please wait a moment and try again.';
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again.';
    } else if (errorMessage.includes('API key')) {
      errorMessage = 'AI service configuration error. Please contact support.';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        reply: 'I apologize, but I encountered a technical issue. Please try again in a moment.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
