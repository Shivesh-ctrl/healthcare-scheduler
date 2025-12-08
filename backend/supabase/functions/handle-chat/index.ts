import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { generateAIResponse } from '../_shared/ai-provider.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import type { ChatRequest, ChatResponse, ConversationMessage, ExtractedInfo } from '../_shared/types.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { message, inquiryId, conversationHistory = [] }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Get authenticated user's email from auth token
    let authenticatedUserEmail: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user?.email) {
          authenticatedUserEmail = user.email;
          console.log('✅ Authenticated user email:', authenticatedUserEmail);
        }
      }
    } catch (err) {
      console.log('ℹ️ No authenticated user or error getting user:', err);
    }

    // Create or load existing inquiry
    let currentInquiryId = inquiryId;
    let inquiry = null;

    if (currentInquiryId) {
      const { data } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', currentInquiryId)
        .single();
      inquiry = data;
    }

    // Get matched therapists first (if we have enough info) to include in system prompt
    let matchedTherapistsForPrompt = undefined;
    let extractedInfoForMatching: Partial<ExtractedInfo> | undefined;
    
    // Check if we have enough info to match therapists
    if (inquiry) {
      // Try to extract info from existing inquiry
      if (inquiry.extracted_specialty && inquiry.insurance_info) {
        extractedInfoForMatching = {
          specialty: inquiry.extracted_specialty,
          insurance: inquiry.insurance_info,
          schedule: inquiry.requested_schedule
        };
      }
    }
    
    // Parse EXTRACTED_INFO from current message if available (will be parsed later, but we need it now)
    const tempAIMessage = message; // We'll parse this after getting AI response, but for now use current message
    
    // Build conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a deeply empathetic, compassionate healthcare scheduling assistant. Always show genuine care and understanding. Provide detailed, warm, and supportive responses (6-20 lines depending on the situation). Validate feelings, acknowledge courage, and offer hope. Extract ALL information from user messages, even if provided together or with spelling mistakes.

**🚨 CRITICAL - EMERGENCY PROTOCOL:**
If the user mentions ANY of the following, you MUST immediately provide crisis helpline information in your response:
- Suicidal thoughts: "I want to kill myself", "I want to die", "ending my life", "suicide"
- Self-harm: "I want to hurt myself", "cutting", "self-harm"
- Immediate danger: "I'm going to harm myself", "I have a plan", "I can't go on"
- Severe crisis: "I can't cope", "I'm in immediate danger", "I need help right now"

**When emergency is detected:**
1. **IMMEDIATELY acknowledge** their pain with deep empathy (2-3 sentences)
2. **Provide crisis helpline numbers prominently** (must be in your response):
   - **988 Suicide & Crisis Lifeline**: Call or text **988** (available 24/7, free and confidential)
   - **Crisis Text Line**: Text **HOME to 741741** (available 24/7, free and confidential)
   - **National Suicide Prevention Lifeline**: **1-800-273-8255** (available 24/7)
3. **Encourage immediate help** (2-3 sentences): "Please reach out to one of these helplines right now. You don't have to go through this alone. These trained counselors can help you right now."
4. **Still offer scheduling help** (1-2 sentences): "I'm also here to help you find a therapist for ongoing support when you're ready."
5. **Total response should be 8-15 lines** for emergency situations

**🚨 CRITICAL - AVAILABLE THERAPISTS (ONLY THESE 8 EXIST - USE EXACT NAMES):**
- **Dr. Sarah Johnson** - anxiety, depression, trauma, ptsd | aetna, bluecross, cigna, united
- **Dr. Michael Chen** - bipolar, depression, mood disorders | aetna, medicare, medicaid
- **Dr. Emily Rodriguez** - couples therapy, relationship issues | bluecross, cigna, humana
- **Dr. James Williams** - addiction, substance abuse, trauma | aetna, bluecross, united, cigna
- **Dr. Lisa Thompson** - child therapy, adhd, autism | medicare, medicaid, bluecross
- **Dr. Robert Martinez** - career counseling, stress management | aetna, cigna, united
- **Dr. Amanda Davis** - eating disorders, body image | aetna, bluecross, humana
- **Dr. David Lee** - geriatric, dementia, depression | medicare, medicaid, aetna

**⚠️ THERAPIST NAME RULES (MANDATORY):**
- **ONLY use the EXACT names listed above** - Dr. Sarah Johnson, Dr. Michael Chen, Dr. Emily Rodriguez, Dr. James Williams, Dr. Lisa Thompson, Dr. Robert Martinez, Dr. Amanda Davis, Dr. David Lee
- **NEVER invent, make up, or suggest other therapist names** like "Dr. Emily Carter", "Dr. John Smith", etc.
- **If user mentions a name NOT in the list above, tell them that therapist is not available and show ONLY the 8 therapists from the list**
- **When showing availability, ONLY mention therapists from the list above**

**SMART INFORMATION EXTRACTION:**
- Extract MULTIPLE pieces of info from ONE message (insurance + schedule + date + time all at once)
- Handle spelling mistakes intelligently (e.g., "blu cross" = "blue cross", "depresion" = "depression")
- Understand dates in ANY format: "Dec 10", "10 december", "12/10", "10th Dec", "December 10th" → convert to YYYY-MM-DD
- Understand times in ANY format: "10am", "10 AM", "10:00", "10:00am", "morning", "afternoon" → convert to HH:MM 24-hour
- Recognize insurance variations: "BCBS", "blue cross", "bluecross", "blue cross blue shield" = "blue cross blue shield"
- Extract partial info and ask for missing pieces naturally

**INSURANCE NAME VARIATIONS (be smart about these):**
- "blue cross", "bluecross", "bcbs", "blue cross blue shield", "blue shield" → "blue cross blue shield"
- "aetna", "etna" → "aetna"
- "cigna", "signa" → "cigna"
- "united", "united healthcare", "uhc" → "united"
- "medicare", "medicair" → "medicare"
- "medicaid", "medicade" → "medicaid"
- "humana", "human" → "humana"

**DATE UNDERSTANDING (be flexible, but ALWAYS FUTURE DATES):**
- "10 december", "dec 10", "10/12", "12/10", "10th december", "december 10th" → "2025-12-10" (if in future)
- "tomorrow", "next monday", "friday" → calculate actual FUTURE date
- Relative dates: "next week", "in 2 weeks" → calculate from today (must be future)
- **CRITICAL: NEVER suggest or mention past dates. If user mentions a past date, ask them to choose a future date**
- **When showing availability, ONLY mention future dates (tomorrow or later)**
- **If calculating dates, ensure they are in the future relative to today**

**TIME UNDERSTANDING (be flexible):**
- "10am", "10 AM", "10:00", "10:00am", "10:00 AM" → "10:00"
- "2pm", "2 PM", "14:00", "2:00pm" → "14:00"
- "morning" → "09:00", "afternoon" → "14:00", "evening" → "17:00"
- "any time", "anytime", "flexible" → keep as "any time"

**RESPONSE LENGTH GUIDELINES (6-15 lines, optimized for speed):**
- **Emergency situations** (suicidal thoughts, self-harm, immediate danger): 8-12 lines. IMMEDIATELY provide helpline numbers (988, Crisis Text Line 741741, 1-800-273-8255). Show deep empathy, validate their pain, encourage immediate help, then offer scheduling support.
- **Emotional situations** (sadness, depression, anxiety): 8-12 lines. Provide empathetic responses. Show genuine care, validate feelings, acknowledge their courage, offer hope and support. Use warm, understanding language.
- **Information collection** (when user provides multiple pieces): 6-8 lines. Acknowledge empathetically what they shared, validate briefly, then ask for the next required piece. Be concise but warm.
- **Routine tasks** (booking, scheduling, confirming): 5-7 lines. Provide warm, supportive responses. Show appreciation, acknowledge importance, offer encouragement.
- **Therapist matching** (showing available therapists): 6-10 lines. Provide encouraging responses with therapist list. Validate their decision, show support.

**RULES:**
- **ONLY use the 8 therapists listed above. NEVER invent names like "Dr. Emily Carter" or any other name not in the list.**
- **If you mention a therapist, it MUST be one of: Dr. Sarah Johnson, Dr. Michael Chen, Dr. Emily Rodriguez, Dr. James Williams, Dr. Lisa Thompson, Dr. Robert Martinez, Dr. Amanda Davis, or Dr. David Lee.**
- **When showing availability, ONLY mention future dates (tomorrow or later), NEVER past dates.**
- **ALWAYS be deeply empathetic, warm, and supportive. Show genuine care in every response.**
- **Validate feelings, acknowledge courage, offer hope and encouragement.**
- Extract ALL available info from each message, don't wait for separate messages.
- For crisis situations, provide: 988 Suicide & Crisis Lifeline (call/text 988), Crisis Text Line (text HOME to 741741).

**COLLECT FOR BOOKING:**
- Therapist name (from list above)
- Date (YYYY-MM-DD format, but accept any input format)
- Time (HH:MM 24-hour format, but accept any input format)
- Patient full name
- Patient email (MANDATORY)
- Patient phone (optional)

**BOOKING_INFO Format (when all info collected):**
BOOKING_INFO: {
  "therapist_name": "Dr. Sarah Johnson",
  "patient_name": "John Doe",
  "patient_email": "john@example.com",
  "patient_phone": "123-456-7890",
  "appointment_date": "2025-12-10",
  "appointment_time": "10:00",
  "timezone": "America/Chicago"
}

**EXTRACTED_INFO Format (extract whenever you have ANY info):**
EXTRACTED_INFO: {
  "problem": "depression",
  "specialty": "depression",
  "schedule": "weekdays any time",
  "insurance": "blue cross blue shield"
}

**EXAMPLES OF SMART EXTRACTION:**

User: "I have blue cross and want appointment on 10 december at 10am"
→ Extract: insurance="blue cross blue shield", date="2025-12-10", time="10:00"

User: "depresion, blu cross, weekdays morning"
→ Extract: problem="depression", specialty="depression", insurance="blue cross blue shield", schedule="weekdays morning"

User: "I'm Ram Singh, email ram@example.com, book with Dr. Sarah Johnson on Dec 10 at 2pm"
→ Extract: patient_name="Ram Singh", patient_email="ram@example.com", therapist_name="Dr. Sarah Johnson" (EXACT name from list), date="2025-12-10" (if future), time="14:00"

**CRITICAL EXAMPLES - WHAT NOT TO DO:**
- ❌ NEVER say "Dr. Emily Carter" - that therapist doesn't exist. Use "Dr. Emily Rodriguez" instead.
- ❌ NEVER mention past dates like "last Wednesday" or dates that have already passed.
- ✅ ALWAYS use exact names: "Dr. Emily Rodriguez", "Dr. Sarah Johnson", etc.
- ✅ ALWAYS suggest future dates: "next Wednesday", "tomorrow", "next week"

**EXAMPLES OF DETAILED EMPATHETIC RESPONSES (6-20 lines):**

**Emotional situation (LONGER, deeply empathetic response):**
User: "I am feeling sad"
→ "I'm really sorry to hear that you're feeling sad. It takes a lot of strength and courage to acknowledge those feelings and reach out for help, and I want you to know that you're not alone in this. Many people experience sadness and find that therapy can be incredibly helpful in working through these difficult emotions. You're taking an important step by reaching out, and I'm here to support you through this process. Would you like to tell me a bit more about what you're experiencing, or would you like me to help you find a therapist who can support you right away?"

**Information collection (6-8 lines, empathetic and fast):**
User: "i am feeling sad i have blue cross insurance and free on weekday any time next week"
→ "I'm really sorry to hear that you're feeling sad, and I want you to know that reaching out for help is a brave and important step. I understand you have Blue Cross insurance and you're available on weekdays at any time next week. That's great information - I can help you find a therapist who accepts your insurance and fits your schedule.

To complete your booking, I'll need your full name and email address. What's your name?"

User: "depression, blue cross, wednesday 10 am"
→ "I understand you're dealing with depression and have Blue Cross insurance, and you'd like to schedule an appointment for Wednesday at 10am. Seeking help for depression is a brave step, and I'm here to support you through this process.

To help you complete your booking, may I have your full name and email address?"

User: "John Doe"
→ "Thank you, John. I appreciate you sharing that with me. To complete your booking and send you a confirmation, I'll need your email address. What email would you like to use?"

User: "john@example.com"
→ "Perfect, thank you. I have all your information. Now, let me help you find the right therapist for you. Based on your needs, I can show you therapists who specialize in depression and accept Blue Cross. Would you like me to show you the available options?"

**CRITICAL: Always show empathy, validate feelings, and acknowledge the courage it takes to seek help. Make responses warm, supportive, and encouraging.**

**Routine task (WARM, supportive response):**
User: "I want to book an appointment"
→ "I'd be happy to help you book an appointment. Taking this step to care for your mental health is really important, and I'm here to make the process as smooth as possible for you. To help match you with the right therapist, which insurance provider do you have?"

**IMPORTANT:** 
- NEVER show EXTRACTED_INFO or BOOKING_INFO to patient (internal only)
- Extract as much info as possible from each message
- Be smart about spelling mistakes and variations
- Always show empathy, validate feelings, and acknowledge the courage it takes to seek help. Make responses warm, supportive, and encouraging.
- Only book when you have ALL required info (therapist, date, time, name, email)`
      },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Get AI response - ONLY use Google Gemini free tier models
    console.log('🤖 Calling AI with Google Gemini (free tier only)...');
    let aiResponse: string;
    try {
      aiResponse = await generateAIResponse(messages, 'google');
      if (!aiResponse || typeof aiResponse !== 'string') {
        throw new Error('AI response is empty or invalid');
      }
    } catch (error: any) {
      console.error('❌ Error generating AI response:', error);
      const errorMessage = error?.message || 'Failed to generate response';
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          reply: 'I apologize, but I encountered a technical issue. Please try again in a moment, or contact support if the problem persists.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if AI extracted information
    let extractedInfo: Partial<ExtractedInfo> | undefined;
    let bookingInfo: any = undefined;
    let cleanResponse = aiResponse;
    
    // Parse EXTRACTED_INFO (remove from patient-facing response)
    console.log('🔍 Checking for EXTRACTED_INFO in AI response...');
    if (aiResponse.includes('EXTRACTED_INFO')) {
      console.log('✅ Found EXTRACTED_INFO in response');
      
      // Match EXTRACTED_INFO block with better regex
      const jsonMatch = aiResponse.match(/EXTRACTED_INFO:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (jsonMatch && jsonMatch[0]) {
        try {
          const jsonString = jsonMatch[0].replace('EXTRACTED_INFO:', '').trim();
          extractedInfo = JSON.parse(jsonString);
          console.log('📋 Extracted info parsed:', extractedInfo);
          
          // Remove EXTRACTED_INFO block completely from response
          cleanResponse = aiResponse.replace(/EXTRACTED_INFO:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '').trim();
          
          // Additional cleanup - remove any remaining EXTRACTED_INFO text
          cleanResponse = cleanResponse.replace(/EXTRACTED_INFO:?[\s\S]*?$/g, '').trim();
          
          // Remove trailing newlines and extra whitespace
          cleanResponse = cleanResponse.replace(/\n{3,}/g, '\n\n').trim();
          
          console.log('✅ EXTRACTED_INFO removed from response');
        } catch (e) {
          console.error('❌ Failed to parse extracted info:', e);
          // If parsing fails, still try to remove the block
          cleanResponse = aiResponse.replace(/EXTRACTED_INFO[\s\S]*/g, '').trim();
        }
      } else {
        console.log('⚠️ EXTRACTED_INFO found but regex match failed, removing all text after EXTRACTED_INFO');
        // If regex fails, remove everything after EXTRACTED_INFO
        const index = aiResponse.indexOf('EXTRACTED_INFO');
        if (index !== -1) {
          cleanResponse = aiResponse.substring(0, index).trim();
        }
      }
    } else {
      console.log('ℹ️ No EXTRACTED_INFO found in response');
    }
    
    // Parse BOOKING_INFO (remove from patient-facing response)
    console.log('🔍 Checking for BOOKING_INFO in AI response...');
    if (cleanResponse.includes('BOOKING_INFO')) {
      console.log('✅ Found BOOKING_INFO in response');
      
      // Match BOOKING_INFO block with better regex
      const bookingMatch = cleanResponse.match(/BOOKING_INFO:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (bookingMatch && bookingMatch[0]) {
        try {
          const jsonString = bookingMatch[0].replace('BOOKING_INFO:', '').trim();
          bookingInfo = JSON.parse(jsonString);
          console.log('📅 Booking info extracted successfully:', JSON.stringify(bookingInfo, null, 2));
          
          // Validate that email is present and not empty
          if (!bookingInfo.patient_email || bookingInfo.patient_email.trim() === '') {
            console.error('❌ BOOKING_INFO missing mandatory patient_email');
            bookingInfo = undefined; // Don't process booking without email
            cleanResponse += '\n\n⚠️ I need your email address to complete the booking. Could you please provide your email?';
          }
          
          // Remove BOOKING_INFO block completely from response
          cleanResponse = cleanResponse.replace(/BOOKING_INFO:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '').trim();
          
          // Additional cleanup - remove any remaining BOOKING_INFO text
          cleanResponse = cleanResponse.replace(/BOOKING_INFO:?[\s\S]*?$/g, '').trim();
          
          // Remove trailing newlines and extra whitespace
          cleanResponse = cleanResponse.replace(/\n{3,}/g, '\n\n').trim();
          
          console.log('✅ BOOKING_INFO removed from response');
        } catch (e) {
          console.error('❌ Failed to parse booking info:', e);
          console.error('Raw booking match:', bookingMatch[0]);
          // If parsing fails, still remove the block
          cleanResponse = cleanResponse.replace(/BOOKING_INFO[\s\S]*/g, '').trim();
        }
      } else {
        console.error('❌ BOOKING_INFO found but regex match failed, removing all text after BOOKING_INFO');
        // If regex fails, remove everything after BOOKING_INFO
        const index = cleanResponse.indexOf('BOOKING_INFO');
        if (index !== -1) {
          cleanResponse = cleanResponse.substring(0, index).trim();
        }
      }
    } else {
      console.log('ℹ️ No BOOKING_INFO found in response');
    }
    
    // Final cleanup - remove any remaining JSON-like blocks that might have been missed
    cleanResponse = cleanResponse.replace(/\{[^}]*"therapist_name"[^}]*\}/g, '').trim();
    cleanResponse = cleanResponse.replace(/\{[^}]*"patient_name"[^}]*\}/g, '').trim();
    cleanResponse = cleanResponse.replace(/\{[^}]*"appointment_date"[^}]*\}/g, '').trim();
    cleanResponse = cleanResponse.replace(/\{[^}]*"problem"[^}]*\}/g, '').trim();
    cleanResponse = cleanResponse.replace(/\{[^}]*"specialty"[^}]*\}/g, '').trim();
    cleanResponse = cleanResponse.replace(/\{[^}]*"insurance"[^}]*\}/g, '').trim();
    
    // Remove any lines that start with common JSON keys
    cleanResponse = cleanResponse.split('\n').filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('"problem"') && 
             !trimmed.startsWith('"symptoms"') && 
             !trimmed.startsWith('"specialty"') && 
             !trimmed.startsWith('"schedule"') && 
             !trimmed.startsWith('"insurance"') &&
             !trimmed.startsWith('"therapist_name"') &&
             !trimmed.startsWith('"patient_name"');
    }).join('\n');
    
    // Final trim and normalize whitespace
    cleanResponse = cleanResponse.replace(/\n{3,}/g, '\n\n').trim();
    
    console.log('✅ Final response cleanup complete');
    console.log('📝 Response preview:', cleanResponse.substring(0, 200));

    // Update conversation history (will be updated with therapist list if matched)
    let newHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: cleanResponse, timestamp: new Date().toISOString() }
    ];

    // Save or update inquiry
    // Note: bookingInfo is already parsed above, so we can use it here
    const inquiryData: any = {
      conversation_history: newHistory,
    };
    
    // Add extracted info
    if (extractedInfo) {
      if (extractedInfo.insurance) inquiryData.insurance_info = extractedInfo.insurance;
      if (extractedInfo.schedule) inquiryData.requested_schedule = extractedInfo.schedule;
      if (extractedInfo.specialty) inquiryData.extracted_specialty = extractedInfo.specialty;
      if (extractedInfo.patient_name) inquiryData.patient_name = extractedInfo.patient_name;
      if (extractedInfo.patient_email) inquiryData.patient_email = extractedInfo.patient_email;
      if (extractedInfo.patient_phone) inquiryData.patient_phone = extractedInfo.patient_phone;
    }
    
    // Also add patient info from bookingInfo if available (this is parsed earlier)
    if (bookingInfo) {
      if (bookingInfo.patient_name) inquiryData.patient_name = bookingInfo.patient_name;
      if (bookingInfo.patient_email) inquiryData.patient_email = bookingInfo.patient_email;
      if (bookingInfo.patient_phone) inquiryData.patient_phone = bookingInfo.patient_phone;
      console.log('📝 Adding patient info from bookingInfo to inquiry:', {
        patient_name: bookingInfo.patient_name,
        patient_email: bookingInfo.patient_email
      });
    }
    
    // Automatically add authenticated user's email if available and not already set
    if (authenticatedUserEmail && !inquiryData.patient_email) {
      inquiryData.patient_email = authenticatedUserEmail;
      console.log('✅ Added authenticated user email to inquiry:', authenticatedUserEmail);
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
      console.log('✅ Created new inquiry with ID:', currentInquiryId);
      console.log('✅ Inquiry patient info:', {
        patient_name: newInquiry.patient_name,
        patient_email: newInquiry.patient_email
      });
    } else {
      const { data: updatedInquiry, error } = await supabase
        .from('inquiries')
        .update(inquiryData)
        .eq('id', currentInquiryId)
        .select()
        .single();

      if (error) throw error;
      inquiry = updatedInquiry;
      console.log('✅ Updated inquiry with ID:', currentInquiryId);
      console.log('✅ Inquiry patient info:', {
        patient_name: updatedInquiry.patient_name,
        patient_email: updatedInquiry.patient_email
      });
    }

    // Get ALL active therapists first to include in system prompt (so AI knows exactly which therapists exist)
    const { data: allActiveTherapists, error: allTherapistsError } = await supabase
      .from('therapists')
      .select('*')
      .eq('is_active', true);
    
    // Build therapist list for AI context - CRITICAL: AI must ONLY use these therapists
    let therapistListForAI = '';
    if (allActiveTherapists && allActiveTherapists.length > 0) {
      therapistListForAI = '\n\n**CRITICAL - AVAILABLE THERAPISTS (ONLY THESE 8 EXIST):**\n';
      allActiveTherapists.forEach((t: any) => {
        therapistListForAI += `- **${t.name}** - Specialties: ${Array.isArray(t.specialties) ? t.specialties.join(', ') : 'General'}\n`;
      });
      therapistListForAI += '\n**YOU MUST ONLY USE THESE 8 THERAPISTS. NEVER MAKE UP OR SUGGEST OTHER THERAPISTS.**\n';
    }

    // Helper function to normalize insurance names (handle variations and spelling mistakes)
    const normalizeInsurance = (insurance: string): string => {
      const normalized = insurance.toLowerCase().trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^a-z0-9\s]/g, ''); // Remove special characters
      
      // Map common variations to standard names
      const insuranceMap: Record<string, string> = {
        'blue cross': 'blue cross blue shield',
        'bluecross': 'blue cross blue shield',
        'bcbs': 'blue cross blue shield',
        'blue shield': 'blue cross blue shield',
        'blue cross blue shield': 'blue cross blue shield',
        'aetna': 'aetna',
        'etna': 'aetna',
        'cigna': 'cigna',
        'signa': 'cigna',
        'united': 'united',
        'united healthcare': 'united',
        'uhc': 'united',
        'medicare': 'medicare',
        'medicair': 'medicare',
        'medicaid': 'medicaid',
        'medicade': 'medicaid',
        'humana': 'humana',
        'human': 'humana',
      };
      
      // Check for partial matches
      for (const [key, value] of Object.entries(insuranceMap)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return value;
        }
      }
      
      return normalized;
    };

    // If we have enough info, find matching therapists
    let matchedTherapists = undefined;
    const needsMoreInfo = !extractedInfo || !extractedInfo.specialty || !extractedInfo.insurance;

    if (!needsMoreInfo && extractedInfo) {
      const specialtyLower = extractedInfo.specialty.toLowerCase().trim();
      const insuranceNormalized = normalizeInsurance(extractedInfo.insurance);

      // Query therapists matching both specialty AND insurance
      const { data: therapists, error: therapistError } = await supabase
        .from('therapists')
        .select('*')
        .eq('is_active', true);

      if (therapistError) {
        console.error('Error fetching therapists:', therapistError);
      } else {
        // Filter therapists in JavaScript to ensure proper matching
        // This is more reliable than using .contains() which can be inconsistent
        matchedTherapists = therapists.filter((therapist: any) => {
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
                     insuranceNormalized.includes(insNormalized) ||
                     ins.toLowerCase().includes(insuranceNormalized) ||
                     insuranceNormalized.includes(ins.toLowerCase());
            });

          return hasSpecialty && hasInsurance;
        });

        // Sort by relevance (exact matches first, then partial matches)
        matchedTherapists = matchedTherapists.sort((a: any, b: any) => {
          const aExactSpecialty = a.specialties.some((s: string) => s.toLowerCase() === specialtyLower);
          const bExactSpecialty = b.specialties.some((s: string) => s.toLowerCase() === specialtyLower);
          const aExactInsurance = a.accepted_insurance.some((ins: string) => {
            const insNorm = normalizeInsurance(ins);
            return insNorm === insuranceNormalized;
          });
          const bExactInsurance = b.accepted_insurance.some((ins: string) => {
            const insNorm = normalizeInsurance(ins);
            return insNorm === insuranceNormalized;
          });

          // Prioritize exact matches
          if (aExactSpecialty && aExactInsurance && !(bExactSpecialty && bExactInsurance)) return -1;
          if (bExactSpecialty && bExactInsurance && !(aExactSpecialty && aExactInsurance)) return 1;
          
          return 0;
        });

        // Update inquiry with matched therapist and status
      if (matchedTherapists && matchedTherapists.length > 0 && matchedTherapists[0] && matchedTherapists[0].id) {
          const firstTherapist = matchedTherapists[0];
          const { error: updateError } = await supabase
          .from('inquiries')
          .update({ 
            status: 'matched',
            matched_therapist_id: firstTherapist.id 
          })
          .eq('id', currentInquiryId);

          if (updateError) {
            console.error('Error updating inquiry:', updateError);
          } else {
            console.log(`Updated inquiry ${currentInquiryId} with matched therapist ${firstTherapist.id}`);
          }
          
          // Add therapist list to conversation history so AI knows which names to use
          console.log('📋 Matched therapists for AI context:', matchedTherapists.map((t: any) => t.name));
          const therapistList = matchedTherapists.map((t: any) => `- **${t.name}** (${Array.isArray(t.specialties) ? t.specialties.join(', ') : 'General'})`).join('\n');
          
          // Update the assistant's response to include therapist list if not already there
          const firstTherapistName = firstTherapist.name || '';
          if (!cleanResponse.includes('therapist') || (firstTherapistName && !cleanResponse.toLowerCase().includes(firstTherapistName.toLowerCase()))) {
            cleanResponse += `\n\nHere are the **therapists** I found for you:\n\n${therapistList}\n\nPlease select one of these therapists by **exact name**, and I'll help you book an appointment.`;
          }
          
          // Update conversation history with therapist list
          newHistory[newHistory.length - 1] = {
            role: 'assistant',
            content: cleanResponse,
            timestamp: new Date().toISOString()
          };
        } else {
          // No matches found - update status to indicate matching was attempted
          await supabase
            .from('inquiries')
            .update({ 
              status: 'pending' // Keep as pending if no matches found
            })
            .eq('id', currentInquiryId);
        }
      }
    }

    // Handle booking if BOOKING_INFO was provided
    console.log('🔍 Checking if booking should be processed...');
    console.log('Booking info exists:', !!bookingInfo);
    if (bookingInfo) {
      console.log('Booking info fields:', {
        therapist_name: !!bookingInfo.therapist_name,
        patient_name: !!bookingInfo.patient_name,
        patient_email: !!bookingInfo.patient_email,
        appointment_date: !!bookingInfo.appointment_date,
        appointment_time: !!bookingInfo.appointment_time
      });
    }
    
    // Validate booking info - email is mandatory
    if (bookingInfo && bookingInfo.therapist_name && bookingInfo.patient_name && 
        bookingInfo.patient_email && bookingInfo.patient_email.trim() !== '' && 
        bookingInfo.appointment_date && bookingInfo.appointment_time) {
      try {
        console.log('📅 Processing booking request...');
        console.log('📅 Full booking info:', JSON.stringify(bookingInfo, null, 2));
        
        // Find therapist by name (flexible matching)
        const { data: allTherapists } = await supabase
          .from('therapists')
          .select('*')
          .eq('is_active', true);
        
        console.log('🔍 Searching for therapist:', bookingInfo.therapist_name);
        console.log('📋 Available therapists:', allTherapists?.map((t: any) => t.name));
        
        // Try multiple matching strategies for better accuracy
        const therapistNameLower = bookingInfo.therapist_name.toLowerCase().trim();
        const therapist = allTherapists?.find((t: any) => {
          const dbNameLower = t.name.toLowerCase().trim();
          
          // Strategy 1: Exact match
          if (dbNameLower === therapistNameLower) return true;
          
          // Strategy 2: Contains match (either direction)
          if (dbNameLower.includes(therapistNameLower) || therapistNameLower.includes(dbNameLower)) return true;
          
          // Strategy 3: Match by last name (common pattern: "Dr. Emily Carter" vs "Emily Carter")
          const dbLastName = dbNameLower.split(' ').pop();
          const searchLastName = therapistNameLower.split(' ').pop();
          if (dbLastName && searchLastName && dbLastName === searchLastName) return true;
          
          // Strategy 4: Match by removing titles (Dr., Mr., Ms., etc.)
          const dbNameNoTitle = dbNameLower.replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s*/i, '').trim();
          const searchNameNoTitle = therapistNameLower.replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s*/i, '').trim();
          if (dbNameNoTitle === searchNameNoTitle) return true;
          
          return false;
        });
        
        if (!therapist) {
          console.error('❌ Therapist not found:', bookingInfo.therapist_name);
          console.error('📋 Available therapist names:', allTherapists?.map((t: any) => t.name));
          
          // Build helpful error message with available therapists (ONLY from the 8 therapists in database)
          let errorMessage = `\n\n⚠️ I couldn't find a therapist named **"${bookingInfo.therapist_name}"** in the system.`;
          
          if (matchedTherapists && matchedTherapists.length > 0) {
            errorMessage += `\n\nHere are the **available therapists** I showed you earlier:\n\n`;
            matchedTherapists.slice(0, 5).forEach((t: any) => {
              errorMessage += `• **${t.name}**\n`;
            });
            errorMessage += `\nPlease select one of these therapists by name, and I'll help you book your appointment.`;
          } else if (allTherapists && allTherapists.length > 0) {
            errorMessage += `\n\nHere are the **therapists available** in our system (these are the only therapists we have):\n\n`;
            allTherapists.forEach((t: any) => {
              errorMessage += `• **${t.name}**\n`;
            });
            errorMessage += `\n\nPlease let me know which therapist you'd like to book with, and I'll help you schedule.`;
          } else {
            errorMessage += `\n\nI'm having trouble finding available therapists. Please try again, or contact support for assistance.`;
          }
          
          cleanResponse += errorMessage;
        } else {
          console.log('✅ Therapist found:', therapist.name);
          // Build start time
          const dateStr = bookingInfo.appointment_date; // YYYY-MM-DD
          const timeStr = bookingInfo.appointment_time; // HH:MM
          
          console.log('📅 Date/Time parsing:', { dateStr, timeStr });
          
          // Handle timezone - use the timezone from bookingInfo or default to America/Chicago
          const timezone = bookingInfo.timezone || 'America/Chicago';
          const startTime = new Date(`${dateStr}T${timeStr}:00`);
          
          if (isNaN(startTime.getTime())) {
            console.error('❌ Invalid date/time format:', { dateStr, timeStr });
            throw new Error(`Invalid date/time format: ${dateStr} ${timeStr}`);
          }
          
          // Check if date is in the past (with buffer to account for timezone differences)
          const now = new Date();
          const bufferMinutes = 30; // 30 minute buffer to account for timezone and current time
          const nowWithBuffer = new Date(now.getTime() + bufferMinutes * 60 * 1000);
          
          if (startTime < nowWithBuffer) {
            console.error('❌ Appointment date is in the past:', startTime, 'Current time:', now);
            const formattedDate = new Date(startTime).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            cleanResponse += `\n\n⚠️ The appointment date you provided (${formattedDate}) is in the past. Please select a future date and time.`;
            throw new Error('Appointment date cannot be in the past');
          }
          
          console.log('✅ Valid start time:', startTime.toISOString());
          
          // Use authenticated user's email if available and bookingInfo doesn't have email
          const finalPatientEmail = bookingInfo.patient_email || authenticatedUserEmail;
          if (!finalPatientEmail) {
            console.error('❌ No patient email available for booking');
            cleanResponse += '\n\n⚠️ I need your email address to complete the booking. Please provide your email.';
            throw new Error('Patient email is required for booking');
          }
          
          // Call book-appointment function internally
          const bookingRequest = {
            inquiryId: currentInquiryId,
            therapistId: therapist.id,
            startTime: startTime.toISOString(),
            patientInfo: {
              patient_name: bookingInfo.patient_name || '',
              patient_email: finalPatientEmail,
              patient_phone: bookingInfo.patient_phone || null,
              notes: bookingInfo.notes || null
            }
          };
          
          console.log('📝 Using patient email for booking:', finalPatientEmail);
          if (authenticatedUserEmail && !bookingInfo.patient_email) {
            console.log('✅ Using authenticated user email:', authenticatedUserEmail);
          }
          
          console.log('📅 Calling book-appointment with:', bookingRequest);
          
          // Call the book-appointment function
          const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
          
          if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase configuration missing');
          }
          
          console.log('📅 Making booking API call to:', `${supabaseUrl}/functions/v1/book-appointment`);
          const bookingResponse = await fetch(`${supabaseUrl}/functions/v1/book-appointment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(bookingRequest),
          });
          
          console.log('📅 Booking API response status:', bookingResponse.status);
          
          if (!bookingResponse.ok) {
            const errorText = await bookingResponse.text();
            console.error('❌ Booking API failed:', {
              status: bookingResponse.status,
              statusText: bookingResponse.statusText,
              error: errorText
            });
            throw new Error(`Booking failed: ${bookingResponse.status} - ${errorText}`);
          }
          
          const bookingResult = await bookingResponse.json();
          console.log('✅ Appointment booked successfully:', JSON.stringify(bookingResult, null, 2));
          console.log('✅ Appointment ID:', bookingResult.appointment?.id);
          console.log('✅ Calendar Event ID:', bookingResult.calendarEventId);
          
          // Verify appointment exists in database
          if (!bookingResult.appointment || !bookingResult.appointment.id) {
            console.error('❌ Booking response missing appointment data:', bookingResult);
            throw new Error('Booking response missing appointment data');
          }
            
            // Update inquiry status AND patient info
            const finalEmail = bookingInfo.patient_email || authenticatedUserEmail;
            const inquiryUpdateData: any = {
              status: 'scheduled',
              matched_therapist_id: therapist.id,
              patient_name: bookingInfo.patient_name || '',
              patient_email: finalEmail,
            };
            
            if (bookingInfo.patient_phone) {
              inquiryUpdateData.patient_phone = bookingInfo.patient_phone;
            }
            
            console.log('📝 Updating inquiry with patient info:', inquiryUpdateData);
            const { error: inquiryUpdateError } = await supabase
              .from('inquiries')
              .update(inquiryUpdateData)
              .eq('id', currentInquiryId);
            
            if (inquiryUpdateError) {
              console.error('⚠️  Failed to update inquiry:', inquiryUpdateError);
            } else {
              console.log('✅ Inquiry updated with patient info and status set to scheduled');
            }
            
            // Verify appointment was created
            console.log('🔍 Verifying appointment in database...');
            const { data: verifyAppointment, error: verifyError } = await supabase
              .from('appointments')
              .select('*')
              .eq('id', bookingResult.appointment.id)
              .single();
            
            if (verifyError) {
              console.error('❌ Could not verify appointment creation:', verifyError);
              console.error('   Appointment ID from booking result:', bookingResult.appointment.id);
              // Try to find any appointments for this inquiry
              const { data: allAppointments } = await supabase
                .from('appointments')
                .select('*')
                .eq('inquiry_id', currentInquiryId);
              console.log('   All appointments for this inquiry:', allAppointments);
            } else {
              console.log('✅ Appointment verified in database:', {
                id: verifyAppointment.id,
                patient_name: verifyAppointment.patient_name,
                patient_email: verifyAppointment.patient_email,
                start_time: verifyAppointment.start_time,
                therapist_id: verifyAppointment.therapist_id
              });
            }
            
            // Update response to confirm booking
            const timeDisplay = new Date(startTime).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
            const dateDisplay = new Date(startTime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            cleanResponse = cleanResponse.replace(
              /(booking|scheduling|appointment).*?/gi,
              ''
            ).trim();
            cleanResponse += `\n\n✅ **Appointment Confirmed!**\n\nYour appointment with **${therapist.name}** has been successfully booked for **${dateDisplay} at ${timeDisplay}**. You should receive a confirmation email shortly at ${bookingInfo.patient_email}.`;
          // This block is now unreachable since we check !bookingResponse.ok above
          // But keeping it for safety
        }
      } catch (error: any) {
        console.error('❌ Error processing booking:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        cleanResponse += `\n\n⚠️ I encountered an error while booking: ${error.message}. Please try again or contact support.`;
      }
    } else {
      console.log('⚠️  Booking info missing required fields - booking not processed');
      if (bookingInfo) {
        console.log('Missing fields:', {
          therapist_name: !bookingInfo.therapist_name,
          patient_name: !bookingInfo.patient_name,
          patient_email: !bookingInfo.patient_email,
          appointment_date: !bookingInfo.appointment_date,
          appointment_time: !bookingInfo.appointment_time
        });
      }
    }

    const response: ChatResponse = {
      reply: cleanResponse,
      inquiryId: currentInquiryId || '',
      extractedInfo,
      needsMoreInfo,
      matchedTherapists,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in handle-chat:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'An error occurred';
    
    // Check for common errors - provide helpful messages
    if (errorMessage.includes('quota') || errorMessage.includes('Quota') || errorMessage.includes('capacity')) {
      errorMessage = 'Google Gemini free tier is at capacity. This is a temporary limit. Please wait 1-2 minutes and try again.';
    } else if (errorMessage.includes('API key')) {
      errorMessage = 'AI service configuration error. Please contact support.';
    } else if (errorMessage.includes('model') || errorMessage.includes('not found')) {
      errorMessage = 'AI model temporarily unavailable. Please try again in a moment.';
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        reply: 'I apologize, but I encountered a technical issue. Please try again in a moment, or contact support if the problem persists.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

