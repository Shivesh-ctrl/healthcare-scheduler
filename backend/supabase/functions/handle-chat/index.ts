import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { generateAIResponse } from '../_shared/ai-provider.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import type { ChatRequest, ChatResponse, ConversationMessage, ExtractedInfo } from '../_shared/types.ts';

serve(async (req: Request) => {
  // Log request start
  console.log('🚀 handle-chat function called');
  console.log('📋 Method:', req.method);
  console.log('📋 URL:', req.url);
  
  // Extract Supabase URL from request URL for calling other functions
  const requestUrl = new URL(req.url);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || `${requestUrl.protocol}//${requestUrl.host}`;
  console.log('🔗 Supabase URL for function calls:', supabaseUrl);
  
  // Handle CORS FIRST - before any other processing
  // Preflight requests must return 204 No Content with no body
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request');
    return new Response(null, { 
      status: 204,
      statusText: 'No Content',
      headers: corsHeaders 
    });
  }

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('📥 Parsing request body...');
    const { message, inquiryId, conversationHistory = [] }: ChatRequest = await req.json();
    console.log('✅ Request parsed. Message length:', message?.length || 0);

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
    let extractedInfoForMatching: Partial<ExtractedInfo> | undefined;
    let extractedInfo: Partial<ExtractedInfo> | undefined; // Declare early to avoid initialization error
    
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
    
    // Find matched therapists BEFORE AI response so AI can include them automatically
    // Use inquiry data if available, or try to extract from message
    let matchedTherapistsForAI = undefined;
    
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
      
      for (const [key, value] of Object.entries(insuranceMap)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return value;
        }
      }
      
      return normalized;
    };
    
    // Try to get specialty and insurance from inquiry or message
    let specialtyForMatching: string | undefined;
    let insuranceForMatching: string | undefined;
    
    if (inquiry && inquiry.extracted_specialty && inquiry.insurance_info) {
      specialtyForMatching = inquiry.extracted_specialty;
      insuranceForMatching = inquiry.insurance_info;
    } else {
      // Try to extract from message (simple keyword matching)
      const messageLower = message.toLowerCase();
      const specialtyKeywords: Record<string, string> = {
        'alcohol': 'addiction', 'addiction': 'addiction', 'substance': 'addiction', 'drinking': 'addiction',
        'depression': 'depression', 'depressed': 'depression', 'sad': 'depression',
        'anxiety': 'anxiety', 'anxious': 'anxiety', 'worry': 'anxiety',
        'trauma': 'trauma', 'ptsd': 'trauma',
        'bipolar': 'bipolar', 'mood': 'bipolar',
        'couples': 'couples', 'relationship': 'couples', 'marriage': 'couples',
        'child': 'child', 'adhd': 'adhd', 'autism': 'autism',
        'career': 'career', 'stress': 'stress', 'work': 'career',
        'eating': 'eating disorders', 'eating disorder': 'eating disorders',
        'geriatric': 'geriatric', 'dementia': 'dementia', 'elderly': 'geriatric',
      };
      
      for (const [keyword, specialty] of Object.entries(specialtyKeywords)) {
        if (messageLower.includes(keyword)) {
          specialtyForMatching = specialty;
          break;
        }
      }
      
      const insuranceKeywords = ['blue cross', 'bcbs', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'];
      for (const keyword of insuranceKeywords) {
        if (messageLower.includes(keyword)) {
          insuranceForMatching = keyword;
          break;
        }
      }
    }
    
    // Get ALL active therapists FIRST (before building system prompt) to include in system prompt
    const { data: allActiveTherapists, error: allTherapistsError } = await supabase
      .from('therapists')
      .select('*')
      .eq('is_active', true);
    
    // Build therapist list for AI context - CRITICAL: AI must ONLY use these therapists
    // Initialize BEFORE system prompt is created
    let therapistListForAI = '';
    if (allActiveTherapists && allActiveTherapists.length > 0) {
      // Create exact name list for validation
      const exactNames = allActiveTherapists.map((t: any) => t.name).join(', ');
      
      therapistListForAI = `\n\n**CRITICAL: ONLY THESE THERAPISTS EXIST - USE EXACT NAMES:**
${exactNames}

**RULES:**
- ONLY use names from list above - NO "Dr." prefix, NO invented names
- If name not in list, say "I can help you find a therapist who specializes in [their need]"
- Copy EXACT name with credentials (LCPC, LCSW, LSW, CADC, LPC)

**THERAPIST DETAILS:**\n`;
      allActiveTherapists.forEach((t: any, index: number) => {
        therapistListForAI += `${index + 1}. **${t.name}** - ${Array.isArray(t.specialties) ? t.specialties.join(', ') : 'General'}\n`;
      });
    }

    // Find matched therapists if we have both specialty and insurance
    if (specialtyForMatching && insuranceForMatching) {
      const specialtyLower = specialtyForMatching.toLowerCase().trim();
      const insuranceNormalized = normalizeInsurance(insuranceForMatching);
      
      if (allActiveTherapists) {
        matchedTherapistsForAI = allActiveTherapists.filter((t: any) => {
          const hasSpecialty = t.specialties && Array.isArray(t.specialties) &&
            t.specialties.some((s: string) => s.toLowerCase().includes(specialtyLower) || specialtyLower.includes(s.toLowerCase()));
          const hasInsurance = t.accepted_insurance && Array.isArray(t.accepted_insurance) &&
            t.accepted_insurance.some((ins: string) => {
              const insNorm = normalizeInsurance(ins);
              return insNorm.includes(insuranceNormalized) || insuranceNormalized.includes(insNorm);
            });
          return hasSpecialty && hasInsurance;
        });
      }
    }

    // Build conversation history - OPTIMIZED SHORT PROMPT for faster responses
    // Get current date for AI context (real calendar date in Indian Standard Time - IST)
    // IMPORTANT: Calculate this BEFORE building the system prompt so it can be used in the prompt
    // Using Asia/Kolkata timezone (IST is UTC+5:30)
    const now = new Date(); // Gets REAL current date/time from system
    
    // Format date in IST timezone using toLocaleDateString with timeZone option
    const currentDateStr = now.toLocaleDateString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Get date components in IST timezone
    const istDateParts = now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/');
    
    // Format as YYYY-MM-DD (IST date)
    // toLocaleDateString returns DD/MM/YYYY format for en-IN
    const currentDateISO = `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}`;
    
    // Get current time in IST for reference
    const currentTimeIST = now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // PUT THERAPIST LIST FIRST - MOST CRITICAL RULE
    let systemPrompt = `${therapistListForAI}

**YOUR ROLE:** Empathetic healthcare scheduling assistant. Be warm, supportive, validate feelings. Extract ALL info from messages (insurance, schedule, date, time, name, email). Handle spelling mistakes.

**CRITICAL RULE - INITIAL CONVERSATION FLOW (ABSOLUTE FORBIDDEN - READ CAREFULLY):**
- 🚨🚨🚨 When user says "I'm looking for therapy" or "I need therapy" or similar - DO NOT mention any therapist names
- 🚨🚨🚨 When user says "I'm looking for [something]" - DO NOT assume they mean a therapist name
- 🚨🚨🚨 NEVER ask "what you're looking for in [Therapist Name]" - this is FORBIDDEN
- 🚨🚨🚨 When user says "I'm looking for therapy", respond by asking about THEIR NEEDS:
  - "What brings you in today? What would you like help with?"
  - "What type of support are you looking for?"
  - "What insurance do you have?"
  - NEVER say "what you're looking for in [Therapist Name]" or mention any therapist name
- 🚨🚨🚨 ONLY ask about what they need help with (problem, specialty, insurance) - NOT about therapist names
- 🚨🚨🚨 FORBIDDEN: "To help me find the best match, could you tell me a little more about what you're looking for in [Therapist Name]?" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 FORBIDDEN: Any question that includes a therapist name when user hasn't mentioned one

**CRITICAL RULE - THERAPIST NAMES (ABSOLUTE FORBIDDEN - READ CAREFULLY):**
- 🚨🚨🚨 NEVER mention a therapist name UNTIL the system has found matches AND user has provided their problem/insurance
- 🚨🚨🚨 NEVER say "I'm here to help you find [Therapist Name]" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "I'm here to support you in finding [Therapist Name]" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "I can help you find [Therapist Name]" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "I can support you in finding [Therapist Name]" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "[Therapist Name] who can provide that support" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "[Therapist Name] who can provide the right care" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "[Therapist Name] who can provide support" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "I want to help you find [Therapist Name]" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "preferences for [Therapist Name]'s gender" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER mention ANY therapist name (including "Jasmine Goins, LCSW") before showing matched therapists - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "*[Therapist Name] insurance" or "•[Therapist Name] insurance" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "[Therapist Name]?" or "Goins, LCSW?" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER include therapist names in bullet points or questions before matching - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 NEVER say "[Therapist Name] would be [date]" or "[Therapist Name] Friday's date"
- 🚨🚨🚨 NEVER use therapist names in date examples like "Friday, [Jasmine Goins, LCSW's Date]"
- 🚨🚨🚨 NEVER say "I'll search for [therapist name]" or mention a therapist before matching
- 🚨🚨🚨 FORBIDDEN EXAMPLES: 
  - "I'm here to help you find Jasmine Goins, LCSW who can provide that support" - FORBIDDEN
  - "I'm here to support you in finding Jasmine Goins, LCSW who can provide the right care" - FORBIDDEN
  - "I understand that you're feeling depressed, and it takes a lot of strength to reach out for help. I'm here to support you in finding Jasmine Goins, LCSW who can provide the right care." - FORBIDDEN
  - "Jasmine Goins, LCSW would be December 13th" - FORBIDDEN
  - "Friday, [Jasmine Goins, LCSW's Date]" - FORBIDDEN
  - "[Jasmine Goins, LCSW Friday's date]" - FORBIDDEN
  - "I can help you find [Therapist Name]" - FORBIDDEN
  - "I can support you in finding [Therapist Name]" - FORBIDDEN
  - ALL FORBIDDEN
- 🚨🚨🚨 NEVER say "you're looking for [Therapist Name]" or "So, to recap, you're looking for [Therapist Name]" - these are FORBIDDEN
- 🚨🚨🚨 NEVER ask "what you're looking for in [Therapist Name]" - ABSOLUTELY FORBIDDEN
- 🚨🚨🚨 If user mentions a therapist name, DO NOT repeat it back - just say "I'll search for therapists who match your criteria"
- 🚨🚨🚨 ONLY mention therapist names AFTER the system has found matches and you're showing results
- 🚨🚨🚨 INSTEAD of saying "I'm here to help you find [Therapist Name]" or "I'm here to support you in finding [Therapist Name]", say "I'm here to help you find the right therapist" or "I'm here to support you in finding the right therapist" or "I'm here to help you find support"
- If user asks about a specific therapist, say "Let me check if that therapist is available" but DON'T mention their name in your response until you've confirmed they match
- When discussing dates, ONLY mention the date itself (e.g., "Friday, December 12th, 2025") - NEVER combine with therapist names
- When user says "next Friday", calculate the actual date from today (${currentDateStr}) and use that date
- NEVER say "I cannot provide information about dates so far into the future" - you MUST accept and work with future dates
- If user provides a future date like "December 12, 2025", accept it and use it - do NOT reject it
- Today is ${currentDateStr} (${currentDateISO}) - use this to calculate "next Friday" or other relative dates
- If today is Wednesday, December 10, 2025, then "next Friday" = Friday, December 12, 2025

**EMERGENCY:** If user mentions suicide/self-harm, immediately provide: 988 (call/text), Crisis Text Line 741741, 1-800-273-8255. Show empathy, encourage immediate help.

**INITIAL CONVERSATION FLOW - CRITICAL:**
When user first says they're looking for therapy or need help:
1. ✅ DO: Ask "What brings you in today?" or "What would you like help with?"
2. ✅ DO: Ask "What insurance do you have?"
3. ✅ DO: Ask about their problem/concerns (anxiety, depression, etc.)
4. ✅ DO: Say "I'm here to help you find the right therapist" or "I'm here to help you find support"
5. ❌ DO NOT: Mention any therapist names (even in helpful phrases)
6. ❌ DO NOT: Say "I'm here to help you find [Therapist Name]"
7. ❌ DO NOT: Say "I can help you find [Therapist Name]"
8. ❌ DO NOT: Say "[Therapist Name] who can provide that support"
9. ❌ DO NOT: Ask "what you're looking for in [Therapist Name]"
10. ❌ DO NOT: Assume they mentioned a therapist name when they say "I'm looking for therapy"
11. ❌ DO NOT: Say "To help me find the best match, could you tell me a little more about what you're looking for in [Therapist Name]?"

**ONLY AFTER you have their problem AND insurance, THEN show matched therapists with names.**
**BEFORE that, use generic phrases like "the right therapist" or "a therapist" - NEVER use actual therapist names.**

**RULES:**
- 🚨🚨🚨 CRITICAL RULE #1: ONLY use therapist names from the EXACT list above. The valid names are: ${allActiveTherapists && allActiveTherapists.length > 0 ? allActiveTherapists.map((t: any) => t.name).join(', ') : 'NONE'}. Before mentioning ANY therapist name, verify it exists in this exact list. If it doesn't exist, DO NOT mention it.
- 🚨🚨🚨 FORBIDDEN: Do NOT invent names like "Dr. Alex Chen", "Dr. Evelyn Reed", "Mr. Alex Chen, LCSW", or any other names. These do NOT exist. Only use the 14 exact names from the list above.
- 🚨🚨🚨 NO "Dr." PREFIX: NONE of our therapists use "Dr." prefix. If you see a name with "Dr.", it is WRONG and does not exist.
- 🚨🚨🚨 NO PLACEHOLDER TEXT: NEVER use placeholder text like "a therapist from our available team", "a therapist", "one of our therapists", or "the therapist". ALWAYS use the EXACT therapist name from the list above. When suggesting a therapist, you MUST include their full name with credentials (e.g., "Rachel Kurt, LCPC" or "Tykisha Bays, LSW, CADC").
- Extract multiple info from one message (insurance+date+time together).
- Insurance: "blue cross"/"bcbs"→"blue cross blue shield", "aetna", "cigna", "united", "medicare", "medicaid", "humana".
- Dates: Accept any format, convert to YYYY-MM-DD. ONLY future dates.
- Times: "10am"→"10:00", "2pm"→"14:00", "morning"→"09:00".

**AUTOMATIC BOOKING - CRITICAL:**
When you have ALL 5 required pieces of information (ALL must be valid and complete), you MUST immediately create BOOKING_INFO and book the appointment:
1. Therapist name (from the list above - use EXACT name, must not be empty)
2. Patient name (must be at least 2 characters, full name preferred)
3. Patient email (valid email format required, e.g., user@example.com - or use authenticated user's email if logged in)
4. Appointment date (YYYY-MM-DD format, MUST be a future date, must be valid calendar date)
5. Appointment time (HH:MM format, 24-hour format, e.g., "10:00" for 10 AM, "14:30" for 2:30 PM)

**VALIDATION REQUIREMENTS - DO NOT CREATE BOOKING_INFO UNLESS ALL FIELDS ARE VALID:**
- Patient name: Must be at least 2 characters long
- Patient email: Must be valid email format (contains @ and domain)
- Appointment date: Must be YYYY-MM-DD format AND must be a future date (not today or past)
- Appointment time: Must be HH:MM format (00:00 to 23:59)
- Therapist name: Must match exactly from the list above

**IF ANY FIELD IS MISSING OR INVALID → DO NOT CREATE BOOKING_INFO - ASK USER TO PROVIDE/CORRECT THE FIELD**

**EXTRACTING BOOKING INFO FROM USER MESSAGES - CRITICAL:**
- When user provides booking details like "Jasmine Goins, Sunday 10:00 AM":
  1. Extract therapist name (match to exact name from list above)
  2. Extract day name ("Sunday") and convert to date (next Sunday = YYYY-MM-DD format)
  3. Extract time ("10:00 AM") and convert to "10:00" format
  4. If missing name/email → Ask: "To complete your booking, I need your full name and email address"
  5. Once you have ALL 5 fields → CREATE BOOKING_INFO immediately

- Day conversion examples:
  • "Sunday" → Next Sunday's date (e.g., "2025-12-15")
  • "Monday" → Next Monday's date
  • Always use future dates only

- Time conversion examples:
  • "10am" or "10:00 AM" → "10:00"
  • "2pm" or "2:00 PM" → "14:00"
  • "10:30 AM" → "10:30"

**CRITICAL BOOKING FLOW:**
1. User provides partial info (therapist + day/time) → Ask for missing fields (name, email)
2. User provides missing fields → CREATE BOOKING_INFO with all 5 fields
3. BOOKING_INFO created → System automatically books appointment

**IF YOU HAVE ALL 5 FIELDS (ALL VALIDATED AND COMPLETE) → CREATE BOOKING_INFO IMMEDIATELY - DO NOT ASK FOR CONFIRMATION**
**IF YOU HAVE PARTIAL INFO OR INVALID FIELDS → Ask for missing/correct fields clearly, then CREATE BOOKING_INFO ONLY when user provides ALL valid fields**

**RESPONSE LENGTH (BE SMART - ADAPT TO CONTEXT):**
- **Therapist bios/details**: FULL responses (15-25 lines) - include specialties, insurance, experience, approach. NEVER cut off mid-sentence.
- **Emergency situations**: 8-12 lines - show deep empathy, provide helplines
- **Emotional situations**: 8-12 lines - validate feelings, show support
- **Information collection**: 6-8 lines - acknowledge, ask for next piece
- **Routine tasks** (booking, confirming): 5-7 lines - warm but concise
- **Simple questions**: 3-5 lines - direct answer

**FORMATS:**
EXTRACTED_INFO: {"problem":"depression","specialty":"depression","insurance":"blue cross blue shield","schedule":"weekdays"}
BOOKING_INFO: {"therapist_name":"Adriane Wilk, LCPC","patient_name":"John Doe","patient_email":"john@example.com","appointment_date":"2025-12-10","appointment_time":"10:00"}

**COLLECT:** Therapist (from list), date (future only), time, name, email (required), phone (optional).
**BOOK:** When you have all 5 required fields → CREATE BOOKING_INFO immediately.
**NEVER show EXTRACTED_INFO/BOOKING_INFO to user - internal only.**`;

    // Add matched therapists to system prompt if available
    if (matchedTherapistsForAI && matchedTherapistsForAI.length > 0) {
      systemPrompt += `\n\n**🎯 MATCHED THERAPISTS FOR USER - CRITICAL DISPLAY RULES:**\n`;
      systemPrompt += `\n**🚨🚨🚨 ABSOLUTE FORBIDDEN - READ CAREFULLY:**\n`;
      systemPrompt += `- ❌❌❌ NEVER use placeholder text like "[Jasmine Goins, LCSW 1]", "[Jasmine Goins, LCSW 2]", "[Therapist Name]", "[Full bio text here]", "[Comma-separated list]" - THESE ARE FORBIDDEN\n`;
      systemPrompt += `- ❌❌❌ NEVER say "Option 1: [Jasmine Goins, LCSW 1]" or "Option 2: [Jasmine Goins, LCSW 2]" - THESE ARE FORBIDDEN\n`;
      systemPrompt += `- ❌❌❌ NEVER use brackets [] or placeholders - ALWAYS use the ACTUAL therapist data provided below\n`;
      systemPrompt += `- ❌❌❌ NEVER repeat the same therapist name multiple times - each therapist is UNIQUE\n`;
      systemPrompt += `- ❌❌❌ NEVER say "therapist, LCSW" or "a therapist" - ALWAYS use the EXACT full name from the list below\n`;
      systemPrompt += `- ❌❌❌ NEVER say "Jasmine Goins, LCSW Therapy (CBT)" - say "Jasmine Goins, LCSW - specializes in CBT"\n`;
      systemPrompt += `- ❌❌❌ NEVER ask about demographics or preferences AFTER showing matches - show matches FIRST\n`;
      
      // Limit to maximum 3 therapists for better user experience
      const therapistsToShow = matchedTherapistsForAI.slice(0, 3);
      
      systemPrompt += `\n**✅✅✅ CORRECT FORMAT - SHOW MAXIMUM 3 THERAPISTS WITH FULL DETAILS:**\n`;
      systemPrompt += `\n**You MUST display therapists in this EXACT format (copy the data below exactly):**\n\n`;
      systemPrompt += `**Here are the therapists I found for you:**\n\n`;
      
      therapistsToShow.forEach((t: any, index: number) => {
        const specialties = Array.isArray(t.specialties) ? t.specialties.join(', ') : 'General';
        const insurance = Array.isArray(t.accepted_insurance) ? t.accepted_insurance.join(', ') : 'Various';
        const bio = t.bio || 'Experienced therapist specializing in your needs.';
        const availability = (extractedInfo?.schedule || extractedInfoForMatching?.schedule) ? `Available: ${extractedInfo?.schedule || extractedInfoForMatching?.schedule}` : 'Available: Flexible scheduling';
        
        systemPrompt += `**${t.name}**\n\n`;
        systemPrompt += `${bio}\n\n`;
        systemPrompt += `**Specialties:** ${specialties}\n`;
        systemPrompt += `**Insurance Accepted:** ${insurance}\n`;
        systemPrompt += `**Availability:** ${availability}\n\n`;
        systemPrompt += `---\n\n`;
      });
      
      systemPrompt += `\n**🚨🚨🚨 CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:**\n`;
      systemPrompt += `1. ✅ Show ONLY the ${therapistsToShow.length} therapist(s) listed above - MAXIMUM 3\n`;
      systemPrompt += `2. ✅ Use EXACT therapist names: ${therapistsToShow.map((t: any) => t.name).join(', ')}\n`;
      systemPrompt += `3. ✅ Copy the EXACT bio text for each therapist from above - do NOT summarize or truncate\n`;
      systemPrompt += `4. ✅ Show specialties and insurance exactly as listed above\n`;
      systemPrompt += `5. ✅ Use this EXACT format: **Therapist Name** followed by bio, then specialties, insurance, availability\n`;
      systemPrompt += `6. ✅ After showing therapists, ask: "Would you like to book an appointment with one of these therapists?"\n`;
      systemPrompt += `7. ❌ DO NOT use "Option 1", "Option 2" format - just show therapist names directly\n`;
      systemPrompt += `8. ❌ DO NOT use placeholder text like "[Jasmine Goins, LCSW]", "[Therapist Name]", or brackets []\n`;
      systemPrompt += `9. ❌ DO NOT repeat "Jasmine Goins, LCSW" multiple times - each therapist has a UNIQUE name\n`;
      systemPrompt += `10. ❌ DO NOT show empty fields like "Name:", "Gender:" - only show what's provided above\n`;
      systemPrompt += `11. ❌ DO NOT ask about demographics, preferences, or reviews - just show the therapists and ask if they want to book\n`;
    }

    // Add current date context to system prompt
    // Note: currentDateStr, currentDateISO, and currentTimeIST are already calculated above (lines 253-282)
    systemPrompt += `\n\n**CURRENT DATE CONTEXT (INDIAN STANDARD TIME - IST) - REAL CALENDAR DATE:**
- 🚨🚨🚨 CRITICAL: Today is EXACTLY: ${currentDateStr}
- 🚨🚨🚨 Current date (YYYY-MM-DD): ${currentDateISO}
- 🚨🚨🚨 Current time (IST): ${currentTimeIST}
- 🚨🚨🚨 Timezone: Indian Standard Time (IST, UTC+5:30, Asia/Kolkata)
- 🚨🚨🚨 IMPORTANT: This is the REAL current date from the system calendar - it updates automatically every day.
- 🚨🚨🚨 When calculating "next Friday" or similar dates, use this EXACT current date: ${currentDateISO} (${currentDateStr}).
- 🚨🚨🚨 Example: If today is ${currentDateStr} (${currentDateISO}), then "next Friday" = Calculate the actual next Friday date from ${currentDateISO}.
- 🚨🚨🚨 ALWAYS use REAL calendar dates (e.g., "Friday, December 12th, 2025") - NEVER use placeholder dates like "October 11th" or "November 10th" or "[date]".
- 🚨🚨🚨 NEVER mention therapist names when discussing dates - only mention the date itself (e.g., "Friday, December 12th, 2025").
- 🚨🚨🚨 FORBIDDEN: "[Therapist Name] would be [date]", "[Therapist Name] Friday's date", "Friday, [Therapist Name's Date]" - these are ABSOLUTELY FORBIDDEN.
- 🚨🚨🚨 CRITICAL DATE HANDLING: Today is ${currentDateStr} (${currentDateISO}). You MUST accept future dates like "December 12, 2025" - do NOT say "I cannot provide information about dates so far into the future".
- 🚨🚨🚨 If user says "next Friday" and today is ${currentDateStr} (${currentDateISO}), then "next Friday" = Calculate the actual next Friday date from ${currentDateISO} (e.g., if today is Wednesday, December 10, 2025, then "next Friday" = Friday, December 12, 2025).
- 🚨🚨🚨 NEVER reject future dates - always accept and work with them.
- 🚨🚨🚨 When user provides a date like "December 12, 2025" or "12 december 2025", use it EXACTLY as provided - do NOT change it or reject it.
- 🚨🚨🚨 Date format in BOOKING_INFO must be YYYY-MM-DD (e.g., "2025-12-12" for December 12, 2025).
- 🚨🚨🚨 NEVER use old dates like "October 11th" - always use the correct date based on ${currentDateISO}.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt
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
      // Log detailed error information for debugging
      console.error('❌ Error generating AI response:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause,
        status: error?.status,
        response: error?.response
      });
      
      const errorMessage = error?.message || 'Failed to generate response';
      const errorName = error?.name || '';
      
      // Create user-friendly error message
      let userFriendlyMessage = 'I apologize, but I encountered a technical issue. Please try again in a moment.';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('at capacity') || errorName === 'AbortError') {
        userFriendlyMessage = 'I\'m sorry, but the AI service is taking longer than expected. Please wait a moment and try again.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('capacity') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        userFriendlyMessage = 'I\'m sorry, but the AI service is currently at capacity. Please wait a moment and try again.';
      } else if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
        userFriendlyMessage = 'I\'m sorry, but there was an authentication issue with the AI service. Please contact support.';
        console.error('🚨 CRITICAL: API key authentication error - check GOOGLE_AI_API_KEY secret');
      } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist') || errorMessage.includes('Model') && errorMessage.includes('not found')) {
        userFriendlyMessage = 'I\'m sorry, but there was a configuration issue with the AI service. Please try again in a moment.';
        console.error('🚨 Configuration issue detected - check model name and API key:', errorMessage);
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyMessage = 'I\'m sorry, but there was a network error. Please check your connection and try again.';
      }
      
      // Return error response that frontend can display
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          reply: userFriendlyMessage,
          inquiryId: currentInquiryId || null,
          matchedTherapists: [],
          needsMoreInfo: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // VALIDATE AI RESPONSE - Check for invented therapist names and placeholder text
    if (allActiveTherapists && allActiveTherapists.length > 0) {
      const validTherapistNames = allActiveTherapists.map((t: any) => t.name.toLowerCase());
      const responseLower = aiResponse.toLowerCase();
      
      // Check for placeholder text that should be replaced with actual therapist names
      const placeholderPatterns = [
        /a therapist from our available team/gi,
        /a therapist/gi,
        /one of our therapists/gi,
        /our available therapist/gi,
        /the therapist/gi,
      ];
      
      // If we have matched therapists, use the first one to replace placeholders
      let replacementTherapist: any = null;
      if (matchedTherapistsForAI && matchedTherapistsForAI.length > 0) {
        replacementTherapist = matchedTherapistsForAI[0];
      } else if (allActiveTherapists.length > 0) {
        // Fallback to first therapist if no matches
        replacementTherapist = allActiveTherapists[0];
      }
      
      // Replace placeholder text with actual therapist name
      for (const pattern of placeholderPatterns) {
        if (pattern.test(aiResponse) && replacementTherapist) {
          console.log(`🔄 Replacing placeholder text with actual therapist name: ${replacementTherapist.name}`);
          aiResponse = aiResponse.replace(pattern, replacementTherapist.name);
        }
      }
      
      // Check for common invented patterns
      const inventedPatterns = [
        /dr\.\s*alex\s*chen/gi,
        /dr\.\s*evelyn\s*reed/gi,
        /dr\.\s*sarah\s*johnson/gi,
        /mr\.\s*alex\s*chen/gi,
        /dr\.\s*[a-z]+\s+[a-z]+/gi, // Any "Dr. FirstName LastName" pattern
      ];
      
      let hasInvalidName = false;
      for (const pattern of inventedPatterns) {
        if (pattern.test(aiResponse)) {
          console.error('❌ AI invented a therapist name with "Dr." prefix or invalid name!');
          hasInvalidName = true;
          // Replace with actual therapist name if available
          if (replacementTherapist) {
            aiResponse = aiResponse.replace(pattern, replacementTherapist.name);
          }
          break;
        }
      }
      
      // Check if response mentions any therapist name not in our list OR mentions therapist names before matching
      // Look for patterns like "Dr. Name", "Name, LCPC", or "[Therapist Name] would be [date]"
      const therapistMentionPattern = /(?:dr\.|mr\.|ms\.|mrs\.)?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)/g;
      
      // Check for patterns like "you're looking for [Therapist Name]" - FORBIDDEN before matching
      const lookingForPattern = /(?:you'?re\s+looking\s+for|so,?\s+to\s+recap,?\s+you'?re\s+looking\s+for)\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)/gi;
      
      // Check for patterns like "I'm here to help you find [Therapist Name]" or "I want to help you find [Therapist Name]" - FORBIDDEN before matching
      const helpFindPattern = /(?:i'?m\s+here\s+to\s+(?:help\s+you\s+find|support\s+you\s+in\s+finding)|i\s+can\s+(?:help\s+you\s+find|support\s+you\s+in\s+finding)|i\s+want\s+to\s+help\s+you\s+find)\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)(?:\s+who\s+can\s+provide\s+(?:that\s+support|the\s+right\s+care|support))?/gi;
      
      // If therapist names are mentioned before matching, remove them
      if ((!matchedTherapistsForAI || matchedTherapistsForAI.length === 0)) {
        if (lookingForPattern.test(aiResponse)) {
          console.error('❌ AI mentioned therapist name with "looking for" before matching - removing');
          // Remove the entire sentence containing "you're looking for [therapist name]"
          aiResponse = aiResponse.replace(lookingForPattern, () => {
            // Replace with generic text
            return "I'll search for therapists who match your criteria";
          });
        }
        
        if (helpFindPattern.test(aiResponse)) {
          console.error('❌ AI mentioned therapist name with "I\'m here to help/support you find" before matching - removing');
          // Replace with generic text - preserve the empathy but remove therapist name
          aiResponse = aiResponse.replace(helpFindPattern, (match, therapistName) => {
            // Check if the sentence starts with empathy (like "I understand that you're feeling...")
            // If so, keep the empathy part but replace the therapist name part
            if (match.toLowerCase().includes('understand') || match.toLowerCase().includes('strength')) {
              return "I'm here to support you in finding the right therapist";
            }
            return "I'm here to help you find the right therapist";
          });
        }
        
        // Also check for the full pattern: "I understand... I'm here to support you in finding [Therapist Name] who can provide the right care"
        const fullEmpathyPattern = /(?:i\s+understand[^.]*\.\s*)?i'?m\s+here\s+to\s+support\s+you\s+in\s+finding\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s+who\s+can\s+provide\s+(?:that\s+support|the\s+right\s+care)/gi;
        if (fullEmpathyPattern.test(aiResponse) && (!matchedTherapistsForAI || matchedTherapistsForAI.length === 0)) {
          console.error('❌ AI mentioned therapist name in full empathy pattern before matching - removing');
          aiResponse = aiResponse.replace(fullEmpathyPattern, (match, therapistName) => {
            // Extract the empathy part if it exists
            const empathyMatch = match.match(/i\s+understand[^.]*\./i);
            if (empathyMatch) {
              return empathyMatch[0] + " I'm here to support you in finding the right therapist who can provide the care you need.";
            }
            return "I'm here to support you in finding the right therapist who can provide the care you need.";
          });
        }
      }
      
      // Also check for patterns like "[Therapist Name] would be [date]" - this should NOT happen before matching
      const therapistDatePattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s+(?:would be|is|will be)/gi;
      
      // If therapist names are mentioned with dates before matching, remove them
      if (therapistDatePattern.test(aiResponse) && (!matchedTherapistsForAI || matchedTherapistsForAI.length === 0)) {
        console.error('❌ AI mentioned therapist name with date before matching - removing');
        // Remove lines that contain therapist name + date pattern
        const lines = aiResponse.split('\n');
        aiResponse = lines.filter(line => {
          return !therapistDatePattern.test(line);
        }).join('\n');
        // Also remove the pattern from the response
        aiResponse = aiResponse.replace(therapistDatePattern, '');
      }
      
      // Check for bracket-style placeholder patterns like "[Jasmine Goins, LCSW 1]", "[Therapist Name]", etc.
      const bracketPlaceholderPatterns = [
        /\[Jasmine Goins, LCSW \d+\]/gi,
        /\[Therapist Name\]/gi,
        /\[Full bio text here\]/gi,
        /\[Comma-separated list[^\]]*\]/gi,
        /\[Jasmine Goins, LCSW[^\]]*\]/gi,
        /Option \d+:\s*\[[^\]]+\]/gi,
        /\[[^\]]*Jasmine Goins[^\]]*\]/gi,
        /\[[^\]]*therapist[^\]]*\]/gi,
      ];
      
      for (const pattern of bracketPlaceholderPatterns) {
        if (pattern.test(aiResponse)) {
          console.error('❌ AI used placeholder text - removing and replacing with actual therapist data');
          // If we have matched therapists, replace placeholders with actual data
          if (matchedTherapistsForAI && matchedTherapistsForAI.length > 0) {
            // Remove all placeholder text
            aiResponse = aiResponse.replace(/\[Jasmine Goins, LCSW \d+\]/gi, '');
            aiResponse = aiResponse.replace(/\[Therapist Name\]/gi, '');
            aiResponse = aiResponse.replace(/\[Full bio text here\]/gi, '');
            aiResponse = aiResponse.replace(/\[Comma-separated list[^\]]*\]/gi, '');
            aiResponse = aiResponse.replace(/\[Jasmine Goins, LCSW[^\]]*\]/gi, '');
            aiResponse = aiResponse.replace(/Option \d+:\s*\[[^\]]+\]/gi, '');
            aiResponse = aiResponse.replace(/\[[^\]]*Jasmine Goins[^\]]*\]/gi, '');
            aiResponse = aiResponse.replace(/\[[^\]]*therapist[^\]]*\]/gi, '');
            
            // If the response is now empty or mostly placeholders, replace with actual therapist list
            if (aiResponse.trim().length < 100 || aiResponse.match(/\[.*\]/g)?.length || 0 > 2) {
              console.log('⚠️ AI response contains too many placeholders - replacing with actual therapist data');
              // Limit to max 3 therapists
              const therapistsToShow = matchedTherapistsForAI.slice(0, 3);
              let therapistList = '\n\n**Here are the therapists I found for you:**\n\n';
              therapistsToShow.forEach((t: any, index: number) => {
                const specialties = Array.isArray(t.specialties) ? t.specialties.join(', ') : 'General';
                const insurance = Array.isArray(t.accepted_insurance) ? t.accepted_insurance.join(', ') : 'Various';
                const bio = t.bio || 'Experienced therapist specializing in your needs.';
                const availability = (extractedInfo?.schedule || extractedInfoForMatching?.schedule) ? `Available: ${extractedInfo?.schedule || extractedInfoForMatching?.schedule}` : 'Available: Flexible scheduling';
                
                therapistList += `**${t.name}**\n\n`;
                therapistList += `${bio}\n\n`;
                therapistList += `**Specialties:** ${specialties}\n`;
                therapistList += `**Insurance Accepted:** ${insurance}\n`;
                therapistList += `**Availability:** ${availability}\n\n`;
                therapistList += `---\n\n`;
              });
              therapistList += `Would you like to book an appointment with one of these therapists?`;
              aiResponse = therapistList;
            }
          } else {
            // Just remove placeholders if no therapists matched
            aiResponse = aiResponse.replace(/\[[^\]]+\]/g, '');
          }
        }
      }
      
      // Check for bad formatting patterns like "therapist, LCSW" or "Jasmine Goins, LCSW Therapy (CBT)"
      const badFormatPatterns = [
        /therapist,?\s*(?:LCSW|LCPC|LSW|CADC|LPC)/gi,
        /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s+Therapy\s*\(/gi,
        /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s*:\s*Are you interested/gi,
        /Are you interested in a specific type of therapy \(e\.g\.,\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s+Therapy/gi,
      ];
      
      for (const pattern of badFormatPatterns) {
        if (pattern.test(aiResponse)) {
          console.error('❌ AI used bad formatting pattern - fixing');
          // Replace "therapist, LCSW" with "a therapist"
          aiResponse = aiResponse.replace(/therapist,?\s*(?:LCSW|LCPC|LSW|CADC|LPC)/gi, 'a therapist');
          // Replace "[Therapist Name] Therapy (CBT)" with "[Therapist Name] - specializes in CBT"
          aiResponse = aiResponse.replace(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s+Therapy\s*\(([^)]+)\)/gi, '$1 - specializes in $2');
          // Remove questions like "Jasmine Goins, LCSW: Are you interested..."
          aiResponse = aiResponse.replace(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s*:\s*Are you interested/gi, 'Are you interested');
          // Remove "Are you interested in a specific type of therapy (e.g., Jasmine Goins, LCSW Therapy..."
          aiResponse = aiResponse.replace(/Are you interested in a specific type of therapy \(e\.g\.,\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s+Therapy/gi, 'Are you interested in a specific type of therapy');
        }
      }
      
      // Check for therapist names in inappropriate contexts BEFORE matching
      if (!matchedTherapistsForAI || matchedTherapistsForAI.length === 0) {
        // Pattern to catch therapist names in bullet points or questions
        const inappropriatePatterns = [
          /(\*|•|-)\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s+(?:insurance|qualities|preferences)/gi,
          /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\s*\?/gi,
          /Goins,?\s*LCSW/gi,
          /Jasmine\s+Goins/gi,
        ];
        
        for (const pattern of inappropriatePatterns) {
          if (pattern.test(aiResponse)) {
            console.error('❌ AI mentioned therapist name in inappropriate context before matching - removing');
            // Remove the entire line or sentence containing the therapist name
            aiResponse = aiResponse.replace(pattern, (match) => {
              // If it's a bullet point, remove the whole line
              if (match.includes('*') || match.includes('•') || match.includes('-')) {
                return '';
              }
              // If it's a question, remove it
              if (match.includes('?')) {
                return '';
              }
              // Otherwise, remove the name part
              return match.replace(/[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?/gi, 'therapist');
            });
          }
        }
        
        // AGGRESSIVE PATTERNS: Catch therapist names concatenated with text or repeated
        // Pattern 1: Therapist name concatenated without spaces (e.g., "haveJasmine Goins, LCSW")
        const concatenatedPattern = /([a-z])([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)/gi;
        if (concatenatedPattern.test(aiResponse)) {
          console.error('❌ AI concatenated therapist name with text before matching - fixing');
          aiResponse = aiResponse.replace(concatenatedPattern, (match, before, therapistName) => {
            // Check if it's a known therapist name
            if (allActiveTherapists && allActiveTherapists.some((t: any) => t.name.toLowerCase().includes(therapistName.toLowerCase()))) {
              return before + ' a therapist';
            }
            return match;
          });
        }
        
        // Pattern 2: Repeated therapist name (e.g., "Jasmine Goins, LCSWJasmine Goins, LCSW")
        const repeatedPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)/gi;
        if (repeatedPattern.test(aiResponse)) {
          console.error('❌ AI repeated therapist name before matching - removing duplicates');
          aiResponse = aiResponse.replace(repeatedPattern, (match, name1, name2) => {
            // If both names are the same, keep only one
            if (name1.toLowerCase() === name2.toLowerCase()) {
              return 'a therapist';
            }
            return match;
          });
        }
        
        // Pattern 3: Therapist name in possessive form (e.g., "Jasmine Goins, LCSW's gender" or "preferences for Jasmine Goins, LCSW's gender")
        const possessivePattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\'?s\s+(?:gender|age|background|preferences|qualities)/gi;
        const preferencesForPattern = /(?:preferences\s+for|do\s+you\s+have\s+any\s+preferences\s+for)\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\'?s\s+(?:gender|age|background|preferences|qualities)/gi;
        
        if (possessivePattern.test(aiResponse) || preferencesForPattern.test(aiResponse)) {
          console.error('❌ AI used therapist name in possessive form before matching - removing');
          // Replace "preferences for [Name]'s gender" with "preferences for a therapist's gender"
          aiResponse = aiResponse.replace(preferencesForPattern, 'preferences for a therapist\'s $1');
          // Replace "[Name]'s gender" with "therapist's preferences"
          aiResponse = aiResponse.replace(possessivePattern, 'therapist\'s preferences');
          // Clean up any remaining therapist name references
          aiResponse = aiResponse.replace(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)\'?s\s+(?:gender|age|background|preferences|qualities)/gi, 'therapist\'s preferences');
        }
        
        // Pattern 4: Therapist name in "preferences for [Name]" or "help you find [Name]" or "want to help you find [Name]"
        const preferencesPattern = /(?:preferences\s+for|help\s+you\s+find|find|support\s+you\s+in\s+finding|want\s+to\s+help\s+you\s+find)\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)(?:\s+who\s+can\s+provide\s+(?:support|that\s+support|the\s+right\s+care))?/gi;
        if (preferencesPattern.test(aiResponse)) {
          console.error('❌ AI mentioned therapist name in preferences/find context before matching - removing');
          aiResponse = aiResponse.replace(preferencesPattern, (match, therapistName) => {
            if (match.includes('preferences')) {
              return 'preferences for a therapist';
            }
            if (match.includes('find') || match.includes('finding') || match.includes('want to help')) {
              // Replace the entire phrase with generic text
              if (match.includes('who can provide')) {
                return 'help you find the right therapist who can provide support';
              }
              return match.replace(therapistName, 'the right therapist').replace(/\s+who\s+can\s+provide\s+support/gi, ' who can provide support');
            }
            return match;
          });
        }
        
        // Pattern 5: Catch any remaining therapist name mentions and replace with generic terms
        // Specifically target "Jasmine Goins, LCSW" as it's the most common offender
        const jasmineGoinsPattern = /Jasmine\s+Goins,?\s*LCSW/gi;
        if (jasmineGoinsPattern.test(aiResponse)) {
          console.error('❌ AI mentioned "Jasmine Goins, LCSW" before matching - removing all instances');
          // Replace all instances of "Jasmine Goins, LCSW" with generic terms based on context
          aiResponse = aiResponse.replace(/I\s+want\s+to\s+help\s+you\s+find\s+Jasmine\s+Goins,?\s*LCSW/gi, 'I want to help you find the right therapist');
          aiResponse = aiResponse.replace(/help\s+you\s+find\s+Jasmine\s+Goins,?\s*LCSW/gi, 'help you find the right therapist');
          aiResponse = aiResponse.replace(/preferences\s+for\s+Jasmine\s+Goins,?\s*LCSW\'?s/gi, 'preferences for a therapist\'s');
          aiResponse = aiResponse.replace(/Jasmine\s+Goins,?\s*LCSW\'?s\s+(?:gender|age|background|preferences)/gi, 'a therapist\'s preferences');
          // Catch any remaining instances
          aiResponse = aiResponse.replace(jasmineGoinsPattern, 'a therapist');
        }
        
        // Pattern 6: Catch any other therapist name mentions
        const anyTherapistNamePattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*(?:LCPC|LCSW|LSW|CADC|LPC))?)/g;
        const therapistMentions = aiResponse.match(anyTherapistNamePattern);
        if (therapistMentions && allActiveTherapists) {
          for (const mention of therapistMentions) {
            // Check if this is a valid therapist name
            const isValidTherapist = allActiveTherapists.some((t: any) => 
              t.name.toLowerCase().includes(mention.toLowerCase()) || 
              mention.toLowerCase().includes(t.name.toLowerCase())
            );
            
            if (isValidTherapist) {
              console.error(`❌ AI mentioned therapist name "${mention}" before matching - replacing with generic term`);
              // Replace in contexts where it shouldn't appear
              // Don't replace if it's in a valid context (like showing matched therapists)
              if (!aiResponse.includes('Here are the therapists') && 
                  !aiResponse.includes('matched therapists') &&
                  !aiResponse.includes('therapist I found')) {
                aiResponse = aiResponse.replace(new RegExp(mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 'a therapist');
              }
            }
          }
        }
      }
      
      const matches = aiResponse.match(therapistMentionPattern);
      if (matches) {
        for (const match of matches) {
          const nameWithoutPrefix = match.replace(/^(?:dr\.|mr\.|ms\.|mrs\.)\s*/i, '').trim();
          const nameLower = nameWithoutPrefix.toLowerCase();
          
          // Check if this name exists in our valid list
          const isValid = validTherapistNames.some(validName => 
            nameLower === validName || 
            nameLower.includes(validName) || 
            validName.includes(nameLower)
          );
          
          // If therapist name appears before matching, remove it
          if ((!matchedTherapistsForAI || matchedTherapistsForAI.length === 0) && isValid) {
            console.error(`❌ AI mentioned therapist name "${match}" before matching - removing`);
            // Remove the therapist name from inappropriate contexts
            aiResponse = aiResponse.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 
              'therapist');
            continue;
          }
          
          if (!isValid && nameLower.length > 5) { // Ignore very short matches
            console.error(`❌ AI mentioned invalid therapist: "${match}" - not in our list!`);
            hasInvalidName = true;
            // Replace the invalid name with actual therapist name if available
            if (replacementTherapist) {
              aiResponse = aiResponse.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 
                replacementTherapist.name);
            } else {
              aiResponse = aiResponse.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 
                'a therapist from our available team');
            }
          }
        }
      }
      
      if (hasInvalidName) {
        console.error('⚠️  AI response contains invented therapist names - attempting to fix...');
        // Remove any section that mentions "Dr." followed by a name
        aiResponse = aiResponse.replace(/###?\s*\d+\.\s*Dr\.\s*[^\n]+\n[\s\S]*?(?=###?\s*\d+\.|$)/gi, '');
        aiResponse = aiResponse.replace(/Dr\.\s*[A-Z][a-z]+\s+[A-Z][a-z]+[^\n]*/gi, '');
      }
    }

    // Check if AI extracted information
    // extractedInfo already declared above (line 76) to avoid initialization error
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
    // IMPORTANT: Check original aiResponse, not cleanResponse, because BOOKING_INFO might be in the original
    console.log('🔍 Checking for BOOKING_INFO in AI response...');
    console.log('🔍 Checking original aiResponse (length:', aiResponse.length, ')');
    
    if (aiResponse.includes('BOOKING_INFO')) {
      console.log('✅ Found BOOKING_INFO in original response');
      
      // Match BOOKING_INFO block with better regex - try multiple patterns
      let bookingMatch = aiResponse.match(/BOOKING_INFO:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      
      // If first pattern doesn't match, try more flexible pattern
      if (!bookingMatch) {
        bookingMatch = aiResponse.match(/BOOKING_INFO\s*:\s*\{[\s\S]*?\}/);
      }
      
      // If still no match, try without colon
      if (!bookingMatch) {
        bookingMatch = aiResponse.match(/BOOKING_INFO\s*\{[\s\S]*?\}/);
      }
      
      if (bookingMatch && bookingMatch[0]) {
        try {
          // Extract JSON string more carefully - preserve nested structures
          let jsonString = bookingMatch[0].replace(/BOOKING_INFO\s*:\s*/i, '').trim();
          
          // Find the first { and last } to extract the complete JSON object
          // This handles nested objects correctly
          const firstBrace = jsonString.indexOf('{');
          const lastBrace = jsonString.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            // Extract the JSON object between first { and last }
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
          } else if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
            // Already a valid JSON object
            jsonString = jsonString.trim();
          } else {
            // Try to fix by ensuring it starts and ends with braces
            jsonString = jsonString.trim();
            if (!jsonString.startsWith('{')) {
              jsonString = '{' + jsonString;
            }
            if (!jsonString.endsWith('}')) {
              jsonString = jsonString + '}';
            }
          }
          
          bookingInfo = JSON.parse(jsonString);
          console.log('📅 Booking info extracted successfully:', JSON.stringify(bookingInfo, null, 2));
          
          // Validate that email is present and not empty - use authenticated email as fallback
          if (!bookingInfo.patient_email || bookingInfo.patient_email.trim() === '') {
            if (authenticatedUserEmail) {
              console.log('✅ Using authenticated user email as fallback:', authenticatedUserEmail);
              bookingInfo.patient_email = authenticatedUserEmail;
            } else {
              console.error('❌ BOOKING_INFO missing mandatory patient_email and no authenticated user');
            bookingInfo = undefined; // Don't process booking without email
            cleanResponse += '\n\n⚠️ I need your email address to complete the booking. Could you please provide your email?';
            }
          }
          
          // Remove BOOKING_INFO block completely from response (from aiResponse)
          cleanResponse = aiResponse.replace(/BOOKING_INFO:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '').trim();
          cleanResponse = cleanResponse.replace(/BOOKING_INFO\s*:\s*\{[\s\S]*?\}/g, '').trim();
          cleanResponse = cleanResponse.replace(/BOOKING_INFO\s*\{[\s\S]*?\}/g, '').trim();
          
          // Additional cleanup - remove any remaining BOOKING_INFO text
          cleanResponse = cleanResponse.replace(/BOOKING_INFO:?[\s\S]*?$/g, '').trim();
          
          // Remove trailing newlines and extra whitespace
          cleanResponse = cleanResponse.replace(/\n{3,}/g, '\n\n').trim();
          
          console.log('✅ BOOKING_INFO removed from response');
        } catch (e) {
          console.error('❌ Failed to parse booking info:', e);
          console.error('Raw booking match:', bookingMatch[0]);
          console.error('Attempted JSON string:', bookingMatch[0].replace(/BOOKING_INFO\s*:\s*/i, '').trim());
          // If parsing fails, still remove the block
          cleanResponse = aiResponse.replace(/BOOKING_INFO[\s\S]*/g, '').trim();
        }
      } else {
        console.error('❌ BOOKING_INFO found but regex match failed');
        console.error('AI Response snippet:', aiResponse.substring(Math.max(0, aiResponse.indexOf('BOOKING_INFO') - 50), Math.min(aiResponse.length, aiResponse.indexOf('BOOKING_INFO') + 200)));
        // If regex fails, remove everything after BOOKING_INFO
        const index = aiResponse.indexOf('BOOKING_INFO');
        if (index !== -1) {
          cleanResponse = aiResponse.substring(0, index).trim();
        }
      }
    } else {
      console.log('ℹ️ No BOOKING_INFO found in response');
      console.log('🔍 Checking if AI response contains booking-related keywords...');
      // Check if AI mentioned booking but didn't use BOOKING_INFO format
      if (aiResponse.toLowerCase().includes('book') || aiResponse.toLowerCase().includes('appointment')) {
        console.log('⚠️ AI mentioned booking but didn\'t use BOOKING_INFO format');
      }
      
      // Try to extract partial booking info from user's message if AI didn't create BOOKING_INFO
      // This handles cases where user provides booking details but AI doesn't format it
      console.log('🔍 Attempting to extract booking info from user message...');
      const userMessageLower = message.toLowerCase();
      
      // Check if user provided therapist name + day/time (common booking pattern)
      if (allActiveTherapists && allActiveTherapists.length > 0) {
        // Look for therapist name in user message
        for (const therapist of allActiveTherapists) {
          const therapistNameLower = therapist.name.toLowerCase();
          // Check if therapist name appears in message (partial match is OK)
          if (userMessageLower.includes(therapistNameLower.split(',')[0].toLowerCase()) || 
              userMessageLower.includes(therapistNameLower.split(' ')[0].toLowerCase()) ||
              userMessageLower.includes(therapistNameLower.split(' ')[1]?.toLowerCase() || '')) {
            console.log(`✅ Found therapist name in user message: ${therapist.name}`);
            
            // Try to extract day, date, and time
            // First, try to extract explicit dates (e.g., "December 12, 2025" or "12 december 2025")
            const explicitDatePatterns = [
              /(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)\s+(\d{1,2}),?\s+(\d{4})/i,
              /(\d{1,2})\s+(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov),?\s+(\d{4})/i,
              /(\d{4}-\d{2}-\d{2})/, // YYYY-MM-DD
              /(\d{1,2}\/\d{1,2}\/\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
            ];
            
            const dayPatterns = [
              /(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i,
              /(?:this\s+)?(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
            ];
            
            const timePatterns = [
              /(\d{1,2})\s*(am|pm|:00\s*(am|pm)?)/i,
              /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
              /morning/i,
              /afternoon/i,
              /evening/i,
            ];
            
            let foundDay = null;
            let foundDate = null;
            let foundTime = null;
            
            // Helper function to parse explicit dates (defined once, reused)
            // Note: This function is also defined later in the code - consider extracting to a shared helper
            const parseExplicitDate = (dateStr: string): string | null => {
              // Try YYYY-MM-DD format
              const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (isoMatch) {
                return dateStr; // Already in correct format
              }
              
              // Try "December 12, 2025" format
              const monthNames: Record<string, number> = {
                'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3,
                'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6,
                'july': 7, 'jul': 7, 'august': 8, 'aug': 8, 'september': 9, 'sep': 9,
                'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
              };
              
              const monthDayYearMatch = dateStr.match(/(december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)\s+(\d{1,2}),?\s+(\d{4})/i);
              if (monthDayYearMatch) {
                const month = monthNames[monthDayYearMatch[1].toLowerCase()];
                const day = parseInt(monthDayYearMatch[2]);
                const year = parseInt(monthDayYearMatch[3]);
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
              
              // Try "12 december 2025" format
              const dayMonthYearMatch = dateStr.match(/(\d{1,2})\s+(december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov),?\s+(\d{4})/i);
              if (dayMonthYearMatch) {
                const day = parseInt(dayMonthYearMatch[1]);
                const month = monthNames[dayMonthYearMatch[2].toLowerCase()];
                const year = parseInt(dayMonthYearMatch[3]);
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
              
              return null;
            };
            
            // First, try to extract explicit dates
            for (const pattern of explicitDatePatterns) {
              const match = message.match(pattern);
              if (match) {
                const dateStr = match[0] || match[1];
                foundDate = parseExplicitDate(dateStr);
                if (foundDate) {
                  console.log(`✅ Found explicit date in message: ${dateStr} → ${foundDate}`);
                  break;
                }
              }
            }
            
            // Helper function to convert day name to date (using IST)
            // IMPORTANT: Uses REAL current date from system - updates automatically every day
            const convertDayToDate = (dayName: string): string | null => {
              const dayMap: Record<string, number> = {
                'sunday': 0, 'sun': 0,
                'monday': 1, 'mon': 1,
                'tuesday': 2, 'tue': 2, 'tues': 2,
                'wednesday': 3, 'wed': 3,
                'thursday': 4, 'thu': 4, 'thurs': 4,
                'friday': 5, 'fri': 5,
                'saturday': 6, 'sat': 6,
              };
              
              const dayLower = dayName.toLowerCase().trim();
              const dayOfWeek = dayMap[dayLower];
              if (dayOfWeek === undefined) return null;
              
              // Get REAL current date in IST (updates automatically every day)
              const now = new Date(); // Gets actual current date from system
              
              // Get day of week in IST using toLocaleDateString
              const currentDayStr = now.toLocaleDateString('en-US', {
                timeZone: 'Asia/Kolkata',
                weekday: 'long'
              }).toLowerCase();
              
              // Map day name to number
              const currentDayMap: Record<string, number> = {
                'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                'thursday': 4, 'friday': 5, 'saturday': 6
              };
              const currentDay = currentDayMap[currentDayStr] ?? now.getDay();
              
              let daysUntil = dayOfWeek - currentDay;
              
              // If the day has passed this week, get next week's date
              if (daysUntil <= 0) {
                daysUntil += 7;
              }
              
              // Calculate target date by adding days to REAL current date
              const targetDate = new Date(now);
              targetDate.setDate(now.getDate() + daysUntil);
              
              // Format as YYYY-MM-DD in IST timezone
              const targetDateParts = targetDate.toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              }).split('/');
              
              // Format as YYYY-MM-DD (DD/MM/YYYY -> YYYY-MM-DD)
              const result = `${targetDateParts[2]}-${targetDateParts[1]}-${targetDateParts[0]}`;
              console.log(`📅 Converted "${dayName}" to date (IST): ${result}`);
              return result;
            };
            
            // Only try day patterns if we didn't find an explicit date
            if (!foundDate) {
              for (const pattern of dayPatterns) {
                const match = message.match(pattern);
                if (match) {
                  foundDay = match[1] || match[2];
                  foundDate = convertDayToDate(foundDay);
                  console.log(`✅ Found day in message: ${foundDay} → ${foundDate}`);
                  break;
                }
              }
            }
            
            for (const pattern of timePatterns) {
              const match = message.match(pattern);
              if (match) {
                // Handle "morning", "afternoon", "evening"
                if (match[0].toLowerCase().includes('morning')) {
                  foundTime = '09:00';
                  console.log(`✅ Found time in message: morning → ${foundTime}`);
                  break;
                } else if (match[0].toLowerCase().includes('afternoon')) {
                  foundTime = '14:00';
                  console.log(`✅ Found time in message: afternoon → ${foundTime}`);
                  break;
                } else if (match[0].toLowerCase().includes('evening')) {
                  foundTime = '18:00';
                  console.log(`✅ Found time in message: evening → ${foundTime}`);
                  break;
                }
                
                // Pattern 1: /(\d{1,2})\s*(am|pm|:00\s*(am|pm)?)/i - matches "10am" or "10:00am"
                // Pattern 2: /(\d{1,2}):(\d{2})\s*(am|pm)?/i - matches "10:30am"
                const hour = parseInt(match[1]);
                let minute = 0;
                let ampm = '';
                
                // Check if match[2] is a number (minutes) or am/pm
                if (match[2] && /^\d+$/.test(match[2])) {
                  // match[2] is minutes (from pattern 2)
                  minute = parseInt(match[2]);
                  ampm = (match[3] || '').toLowerCase();
                } else {
                  // match[2] is am/pm (from pattern 1)
                  ampm = (match[2] || match[3] || match[4] || '').toLowerCase();
                  minute = 0; // Default to 0 minutes for "10am" format
                }
                
                // Validate parsed values
                if (isNaN(hour) || hour < 1 || hour > 12) {
                  console.error('❌ Invalid hour:', hour);
                  continue; // Try next pattern
                }
                if (isNaN(minute) || minute < 0 || minute > 59) {
                  console.error('❌ Invalid minute:', minute);
                  minute = 0; // Default to 0 if invalid
                }
                
                let hour24 = hour;
                if (ampm === 'pm' && hour !== 12) hour24 = hour + 12;
                if (ampm === 'am' && hour === 12) hour24 = 0;
                
                foundTime = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                console.log(`✅ Found time in message: ${match[0]} → ${foundTime}`);
                break;
              }
            }
            
            // If we found therapist + (day or time), create partial booking info
            if (foundDay || foundTime) {
              console.log('📅 Creating partial booking info from user message...');
              bookingInfo = {
                therapist_name: therapist.name,
                appointment_date: foundDate || null,
                appointment_time: foundTime || null,
                patient_name: null,
                patient_email: authenticatedUserEmail || null,
              };
              console.log('📅 Partial booking info created:', bookingInfo);
            }
            break;
          }
        }
      }
    }
    
    // IMPORTANT: Merge booking info from conversation history BEFORE parsing BOOKING_INFO
    // This ensures we have complete info even if AI didn't create BOOKING_INFO
    // Also check if we can extract booking info from conversation even if bookingInfo doesn't exist yet
    if (!bookingInfo) {
      // Try to extract booking info from conversation history if we have therapist + date/time mentioned
      console.log('🔍 No bookingInfo yet - checking conversation for booking details...');
      
      // Check if user mentioned a therapist in conversation
      let mentionedTherapist = null;
      for (const msg of [...conversationHistory, { role: 'user' as const, content: message }]) {
        if (msg.role === 'user' && allActiveTherapists) {
          for (const therapist of allActiveTherapists) {
            const therapistNameLower = therapist.name.toLowerCase();
            if (msg.content.toLowerCase().includes(therapistNameLower.split(',')[0].toLowerCase()) ||
                msg.content.toLowerCase().includes(therapistNameLower.split(' ')[0].toLowerCase())) {
              mentionedTherapist = therapist;
              console.log(`✅ Found therapist mentioned in conversation: ${therapist.name}`);
              break;
            }
          }
          if (mentionedTherapist) break;
        }
      }
      
      // If therapist mentioned, try to extract other booking details
      if (mentionedTherapist) {
        bookingInfo = {
          therapist_name: mentionedTherapist.name,
          appointment_date: null,
          appointment_time: null,
          patient_name: null,
          patient_email: authenticatedUserEmail || null,
        };
      }
    }
    
    // Merge booking info from conversation history if we have partial booking info
    // This handles cases where user provides details across multiple messages
    if (bookingInfo && (!bookingInfo.patient_name || !bookingInfo.patient_email || !bookingInfo.appointment_date || !bookingInfo.appointment_time || !bookingInfo.therapist_name)) {
      console.log('🔍 Checking conversation history for additional booking info...');
      
      // Look through conversation history for booking-related information
      for (const msg of conversationHistory) {
        if (msg.role === 'user') {
          const userMsg = msg.content.toLowerCase();
          
          // Try to extract therapist name if not already set
          if (!bookingInfo.therapist_name && allActiveTherapists) {
            for (const therapist of allActiveTherapists) {
              const therapistNameLower = therapist.name.toLowerCase();
              if (msg.content.toLowerCase().includes(therapistNameLower.split(',')[0].toLowerCase()) ||
                  msg.content.toLowerCase().includes(therapistNameLower.split(' ')[0].toLowerCase())) {
                bookingInfo.therapist_name = therapist.name;
                console.log(`✅ Extracted therapist name from history: ${bookingInfo.therapist_name}`);
                break;
              }
            }
          }
          
          // Try to extract patient name (look for patterns like "I'm John", "My name is John", "John Doe")
          if (!bookingInfo.patient_name) {
            const namePatterns = [
              /(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
              /^([A-Z][a-z]+\s+[A-Z][a-z]+)$/, // Simple "FirstName LastName" pattern
            ];
            
            for (const pattern of namePatterns) {
              const match = msg.content.match(pattern);
              if (match && match[1]) {
                bookingInfo.patient_name = match[1].trim();
                console.log(`✅ Extracted patient name from history: ${bookingInfo.patient_name}`);
                break;
              }
            }
          }
          
          // Try to extract email
          if (!bookingInfo.patient_email) {
            const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
            const match = msg.content.match(emailPattern);
            if (match && match[1]) {
              bookingInfo.patient_email = match[1].trim();
              console.log(`✅ Extracted patient email from history: ${bookingInfo.patient_email}`);
            }
          }
          
          // Try to extract date if we have time but not date
          if (!bookingInfo.appointment_date) {
            // First try explicit dates
            const explicitDatePatterns = [
              /(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)\s+(\d{1,2}),?\s+(\d{4})/i,
              /(\d{1,2})\s+(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov),?\s+(\d{4})/i,
              /(\d{4}-\d{2}-\d{2})/, // YYYY-MM-DD
              /(\d{1,2}\/\d{1,2}\/\d{4})/, // MM/DD/YYYY
            ];
            
            const datePatterns = [
              ...explicitDatePatterns,
              /(?:on|for)\s+(\w+day)/i, // "on Sunday"
            ];
            
            // Helper to parse explicit dates (reuse same logic as above)
            // Note: This is a duplicate of parseExplicitDate defined earlier - consider extracting to shared helper
            const parseExplicitDateLocal = (dateStr: string): string | null => {
              const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (isoMatch) return dateStr;
              
              const monthNames: Record<string, number> = {
                'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3,
                'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6,
                'july': 7, 'jul': 7, 'august': 8, 'aug': 8, 'september': 9, 'sep': 9,
                'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
              };
              
              const monthDayYearMatch = dateStr.match(/(december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)\s+(\d{1,2}),?\s+(\d{4})/i);
              if (monthDayYearMatch) {
                const month = monthNames[monthDayYearMatch[1].toLowerCase()];
                const day = parseInt(monthDayYearMatch[2]);
                const year = parseInt(monthDayYearMatch[3]);
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
              
              const dayMonthYearMatch = dateStr.match(/(\d{1,2})\s+(december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov),?\s+(\d{4})/i);
              if (dayMonthYearMatch) {
                const day = parseInt(dayMonthYearMatch[1]);
                const month = monthNames[dayMonthYearMatch[2].toLowerCase()];
                const year = parseInt(dayMonthYearMatch[3]);
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
              
              return null;
            };
            
            for (const pattern of datePatterns) {
              const match = msg.content.match(pattern);
              if (match && match[1]) {
                // First try to parse as explicit date
                const explicitDate = parseExplicitDateLocal(match[0] || match[1]);
                if (explicitDate) {
                  bookingInfo.appointment_date = explicitDate;
                  console.log(`✅ Extracted explicit date from history: ${explicitDate}`);
                  break;
                }
                
                // If it's a day name, convert it
                if (match[1].match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) {
                  // Use the same conversion function we have above
                  const dayMap: Record<string, number> = {
                    'sunday': 0, 'sun': 0, 'monday': 1, 'mon': 1,
                    'tuesday': 2, 'tue': 2, 'tues': 2, 'wednesday': 3, 'wed': 3,
                    'thursday': 4, 'thu': 4, 'thurs': 4, 'friday': 5, 'fri': 5,
                    'saturday': 6, 'sat': 6,
                  };
                  const dayLower = match[1].toLowerCase().trim();
                  const dayOfWeek = dayMap[dayLower];
                  if (dayOfWeek !== undefined) {
                    // Get current date in IST
                    const now = new Date();
                    
                    // Get day of week in IST
                    const currentDayStr = now.toLocaleDateString('en-US', {
                      timeZone: 'Asia/Kolkata',
                      weekday: 'long'
                    }).toLowerCase();
                    
                    const currentDayMap: Record<string, number> = {
                      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                      'thursday': 4, 'friday': 5, 'saturday': 6
                    };
                    const currentDay = currentDayMap[currentDayStr] ?? now.getDay();
                    
                    let daysUntil = dayOfWeek - currentDay;
                    if (daysUntil <= 0) daysUntil += 7;
                    
                    // Calculate target date
                    const targetDate = new Date(now);
                    targetDate.setDate(now.getDate() + daysUntil);
                    
                    // Format as YYYY-MM-DD in IST timezone
                    const targetDateParts = targetDate.toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }).split('/');
                    
                    bookingInfo.appointment_date = `${targetDateParts[2]}-${targetDateParts[1]}-${targetDateParts[0]}`;
                    console.log(`✅ Extracted/converted date from history (IST): ${bookingInfo.appointment_date}`);
                    break;
                  }
                } else {
                  // Try to parse as date
                  const parsedDate = new Date(match[1]);
                  if (!isNaN(parsedDate.getTime())) {
                    const year = parsedDate.getFullYear();
                    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(parsedDate.getDate()).padStart(2, '0');
                    bookingInfo.appointment_date = `${year}-${month}-${day}`;
                    console.log(`✅ Extracted date from history: ${bookingInfo.appointment_date}`);
                    break;
                  }
                }
              }
            }
          }
        }
      }
      
      // Also check current message for missing fields
      if (!bookingInfo.patient_name || !bookingInfo.patient_email || !bookingInfo.appointment_date) {
        // Extract name from current message
        if (!bookingInfo.patient_name) {
          const namePatterns = [
            /(?:my name is|i'm|i am|this is|call me|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
            /^([A-Z][a-z]+\s+[A-Z][a-z]+)$/,
          ];
          for (const pattern of namePatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              bookingInfo.patient_name = match[1].trim();
              console.log(`✅ Extracted patient name from current message: ${bookingInfo.patient_name}`);
              break;
            }
          }
        }
        
        // Extract email from current message
        if (!bookingInfo.patient_email) {
          const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
          const match = message.match(emailPattern);
          if (match && match[1]) {
            bookingInfo.patient_email = match[1].trim();
            console.log(`✅ Extracted patient email from current message: ${bookingInfo.patient_email}`);
          }
        }
        
        // Extract explicit date from current message (e.g., "12 december 2025")
        if (!bookingInfo.appointment_date) {
          const explicitDatePatterns = [
            /(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)\s+(\d{1,2}),?\s+(\d{4})/i,
            /(\d{1,2})\s+(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov),?\s+(\d{4})/i,
            /(\d{4}-\d{2}-\d{2})/, // YYYY-MM-DD
          ];
          
          const monthNames: Record<string, number> = {
            'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3,
            'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6,
            'july': 7, 'jul': 7, 'august': 8, 'aug': 8, 'september': 9, 'sep': 9,
            'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
          };
          
          for (const pattern of explicitDatePatterns) {
            const match = message.match(pattern);
            if (match) {
              const dateStr = match[0];
              
              // Try YYYY-MM-DD format
              const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (isoMatch) {
                bookingInfo.appointment_date = dateStr;
                console.log(`✅ Extracted date from current message: ${dateStr}`);
                break;
              }
              
              // Try "December 12, 2025" format
              const monthDayYearMatch = dateStr.match(/(december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)\s+(\d{1,2}),?\s+(\d{4})/i);
              if (monthDayYearMatch) {
                const month = monthNames[monthDayYearMatch[1].toLowerCase()];
                const day = parseInt(monthDayYearMatch[2]);
                const year = parseInt(monthDayYearMatch[3]);
                bookingInfo.appointment_date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                console.log(`✅ Extracted date from current message: ${dateStr} → ${bookingInfo.appointment_date}`);
                break;
              }
              
              // Try "12 december 2025" format
              const dayMonthYearMatch = dateStr.match(/(\d{1,2})\s+(december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov),?\s+(\d{4})/i);
              if (dayMonthYearMatch) {
                const day = parseInt(dayMonthYearMatch[1]);
                const month = monthNames[dayMonthYearMatch[2].toLowerCase()];
                const year = parseInt(dayMonthYearMatch[3]);
                bookingInfo.appointment_date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                console.log(`✅ Extracted date from current message: ${dateStr} → ${bookingInfo.appointment_date}`);
                break;
              }
            }
          }
        }
      }
      
      // If we now have all fields after merging, force AI to create BOOKING_INFO
      const hasAllFields = bookingInfo.therapist_name && 
                          bookingInfo.patient_name && 
                          bookingInfo.patient_email && 
                          bookingInfo.appointment_date && 
                          bookingInfo.appointment_time;
      
      if (hasAllFields) {
        console.log('✅ All booking fields collected after merging! Forcing BOOKING_INFO creation.');
        console.log('📅 Complete booking info:', JSON.stringify(bookingInfo, null, 2));
        
        // Create BOOKING_INFO string to inject into AI response
        // This ensures the booking happens even if AI doesn't create it
        const bookingInfoString = `BOOKING_INFO: ${JSON.stringify(bookingInfo)}`;
        
        // Check if AI response already has BOOKING_INFO
        if (!aiResponse.includes('BOOKING_INFO')) {
          console.log('⚠️ AI did not create BOOKING_INFO - injecting it into response');
          // Inject BOOKING_INFO at the end of AI response (will be extracted later)
          aiResponse += `\n\n${bookingInfoString}`;
          // Also update cleanResponse to include it for extraction
          cleanResponse = aiResponse;
        }
      } else {
        console.log('⚠️ Still missing fields after merging:', {
          therapist_name: !!bookingInfo.therapist_name,
          patient_name: !!bookingInfo.patient_name,
          patient_email: !!bookingInfo.patient_email,
          appointment_date: !!bookingInfo.appointment_date,
          appointment_time: !!bookingInfo.appointment_time,
        });
      }
    }
    
    // CRITICAL: Re-parse BOOKING_INFO if we just injected it
    // This ensures the booking is processed even if AI didn't create it
    if (aiResponse.includes('BOOKING_INFO') && !bookingInfo) {
      console.log('🔍 Re-parsing BOOKING_INFO after injection...');
      const bookingMatch = aiResponse.match(/BOOKING_INFO:\s*\{[\s\S]*?\}/);
      if (bookingMatch && bookingMatch[0]) {
        try {
          const jsonString = bookingMatch[0].replace(/BOOKING_INFO\s*:\s*/i, '').trim();
          const firstBrace = jsonString.indexOf('{');
          const lastBrace = jsonString.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            const extractedJson = jsonString.substring(firstBrace, lastBrace + 1);
            bookingInfo = JSON.parse(extractedJson);
            console.log('✅ Re-parsed BOOKING_INFO after injection:', JSON.stringify(bookingInfo, null, 2));
          }
        } catch (e) {
          console.error('❌ Failed to re-parse injected BOOKING_INFO:', e);
        }
      }
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

    // If we have enough info, find matching therapists
    let matchedTherapists = undefined;
    const needsMoreInfo = !extractedInfo || !extractedInfo.specialty || !extractedInfo.insurance;

    if (!needsMoreInfo && extractedInfo) {
      const specialtyLower = extractedInfo.specialty.toLowerCase().trim();
      const insuranceNormalized = normalizeInsurance(extractedInfo.insurance);

      // Reuse allActiveTherapists fetched earlier instead of querying again
      if (allActiveTherapists) {
        // Filter therapists in JavaScript to ensure proper matching
        // This is more reliable than using .contains() which can be inconsistent
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
      } else {
        console.error('Error: allActiveTherapists not available for matching');
      }

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
          
          // Check if AI response already shows matched therapists properly
          let showsTherapists = false;
          for (const therapist of matchedTherapists) {
            if (cleanResponse.toLowerCase().includes(therapist.name.toLowerCase())) {
              showsTherapists = true;
              break;
            }
          }
          
          // Check if AI response contains placeholder text or broken formatting
          const hasPlaceholderText = cleanResponse.includes('Jasmine Goins, LCSW:') || 
                                     cleanResponse.includes('Option 1:') ||
                                     cleanResponse.includes('Option 2:') ||
                                     cleanResponse.includes('Option 3:') ||
                                     (cleanResponse.includes('Name:') && !cleanResponse.match(/\*\*[A-Z][a-z]+ [A-Z][a-z]+(?:, (?:LCPC|LCSW|LSW|CADC|LPC))?\*\*/)) ||
                                     cleanResponse.includes('therapist, LCSW') ||
                                     cleanResponse.includes('therapist, LCPC') ||
                                     cleanResponse.match(/Jasmine Goins, LCSW[:\s]/g)?.length || 0 > 2;
          
          // If AI didn't show therapists properly or has placeholder text, replace with formatted list
          if (!showsTherapists || hasPlaceholderText) {
            console.log('⚠️ AI did not show matched therapists properly or used placeholder text - replacing with formatted list');
            
            // Limit to max 3 therapists
            const therapistsToShow = matchedTherapists.slice(0, 3);
            
            let therapistList = '\n\n**Here are the therapists I found for you:**\n\n';
            therapistsToShow.forEach((t: any, index: number) => {
              const specialties = Array.isArray(t.specialties) ? t.specialties.join(', ') : 'General';
              const insurance = Array.isArray(t.accepted_insurance) ? t.accepted_insurance.join(', ') : 'Various';
              const bio = t.bio || 'Experienced therapist specializing in your needs.';
              const availability = (extractedInfo?.schedule || extractedInfoForMatching?.schedule) ? `Available: ${extractedInfo?.schedule || extractedInfoForMatching?.schedule}` : 'Available: Flexible scheduling';
              
              therapistList += `**${t.name}**\n\n`;
              therapistList += `${bio}\n\n`;
              therapistList += `**Specialties:** ${specialties}\n`;
              therapistList += `**Insurance Accepted:** ${insurance}\n`;
              therapistList += `**Availability:** ${availability}\n\n`;
              therapistList += `---\n\n`;
            });
            
            therapistList += `Would you like to book an appointment with one of these therapists?`;
            
            // Replace the entire AI response with properly formatted therapist list
            cleanResponse = therapistList;
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
      console.log('📋 Booking info fields received:', {
        therapist_name: bookingInfo.therapist_name || 'MISSING',
        patient_name: bookingInfo.patient_name || 'MISSING',
        patient_email: bookingInfo.patient_email || 'MISSING',
        appointment_date: bookingInfo.appointment_date || 'MISSING',
        appointment_time: bookingInfo.appointment_time || 'MISSING',
        patient_phone: bookingInfo.patient_phone || 'optional'
      });
    }
    
    // Validate booking info - email is mandatory (use authenticated email as fallback)
    if (bookingInfo && !bookingInfo.patient_email && authenticatedUserEmail) {
      console.log('✅ Adding authenticated user email to bookingInfo as fallback:', authenticatedUserEmail);
      bookingInfo.patient_email = authenticatedUserEmail;
    }
    
    // Comprehensive validation function for email format
    const isValidEmail = (email: string): boolean => {
      if (!email || typeof email !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    };
    
    // Comprehensive validation function for date format (YYYY-MM-DD)
    const isValidDate = (dateStr: string): boolean => {
      if (!dateStr || typeof dateStr !== 'string') return false;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr.trim())) return false;
      
      // Check if it's a valid date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      
      // Check if date matches the input (catches invalid dates like 2025-13-45)
      const [year, month, day] = dateStr.split('-').map(Number);
      return date.getFullYear() === year && 
             date.getMonth() + 1 === month && 
             date.getDate() === day;
    };
    
    // Comprehensive validation function for time format (HH:MM)
    const isValidTime = (timeStr: string): boolean => {
      if (!timeStr || typeof timeStr !== 'string') return false;
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(timeStr.trim());
    };
    
    // Validate booking info - all required fields must be present AND valid
    // Check each field individually for better error messages
    const hasTherapistName = bookingInfo && bookingInfo.therapist_name && bookingInfo.therapist_name.trim() !== '';
    const hasPatientName = bookingInfo && bookingInfo.patient_name && bookingInfo.patient_name.trim() !== '' && bookingInfo.patient_name.trim().length >= 2;
    const hasPatientEmail = bookingInfo && bookingInfo.patient_email && bookingInfo.patient_email.trim() !== '' && isValidEmail(bookingInfo.patient_email);
    const hasAppointmentDate = bookingInfo && bookingInfo.appointment_date && bookingInfo.appointment_date.trim() !== '' && isValidDate(bookingInfo.appointment_date);
    const hasAppointmentTime = bookingInfo && bookingInfo.appointment_time && bookingInfo.appointment_time.trim() !== '' && isValidTime(bookingInfo.appointment_time);
    
    // Additional validation: Check if date is in the future
    let isFutureDate = false;
    if (hasAppointmentDate && bookingInfo.appointment_date) {
      const appointmentDate = new Date(bookingInfo.appointment_date);
      const now = new Date();
      const bufferMinutes = 30; // 30 minute buffer
      const nowWithBuffer = new Date(now.getTime() + bufferMinutes * 60 * 1000);
      isFutureDate = appointmentDate >= nowWithBuffer;
    }
    
    // All fields must be present, valid, and date must be in the future
    const allFieldsPresent = hasTherapistName && hasPatientName && hasPatientEmail && hasAppointmentDate && hasAppointmentTime && isFutureDate;
    
    if (bookingInfo && !allFieldsPresent) {
      const missingFields = [];
      const invalidFields = [];
      
      if (!hasTherapistName) missingFields.push('therapist_name');
      if (!hasPatientName) {
        if (bookingInfo.patient_name && bookingInfo.patient_name.trim().length < 2) {
          invalidFields.push('patient_name (must be at least 2 characters)');
        } else {
          missingFields.push('patient_name');
        }
      }
      if (!hasPatientEmail) {
        if (bookingInfo.patient_email && !isValidEmail(bookingInfo.patient_email)) {
          invalidFields.push('patient_email (invalid format)');
        } else {
          missingFields.push('patient_email');
        }
      }
      if (!hasAppointmentDate) {
        if (bookingInfo.appointment_date && !isValidDate(bookingInfo.appointment_date)) {
          invalidFields.push('appointment_date (invalid format, must be YYYY-MM-DD)');
        } else {
          missingFields.push('appointment_date');
        }
      }
      if (!hasAppointmentTime) {
        if (bookingInfo.appointment_time && !isValidTime(bookingInfo.appointment_time)) {
          invalidFields.push('appointment_time (invalid format, must be HH:MM)');
        } else {
          missingFields.push('appointment_time');
        }
      }
      if (hasAppointmentDate && !isFutureDate) {
        invalidFields.push('appointment_date (must be a future date)');
      }
      
      console.log('⚠️  Booking info missing required fields:', missingFields);
      console.log('⚠️  Booking info has invalid fields:', invalidFields);
      console.log('⚠️  Booking info validation failed - booking not processed');
      
      // Always ask for missing or invalid fields if we have partial booking info
      // This ensures we collect all required information with proper validation
      const missingFieldsList = missingFields.map(f => {
        if (f === 'therapist_name') return 'therapist name';
        if (f === 'patient_name') return 'your full name';
        if (f === 'patient_email') return 'your email address';
        if (f === 'appointment_date') return 'appointment date (format: YYYY-MM-DD)';
        if (f === 'appointment_time') return 'appointment time (format: HH:MM)';
        return f;
      }).join(', ');
      
      const invalidFieldsList = invalidFields.map(f => {
        if (f.includes('patient_name')) return 'your full name (must be at least 2 characters)';
        if (f.includes('patient_email')) return 'your email address (invalid format)';
        if (f.includes('appointment_date')) return 'appointment date (must be YYYY-MM-DD format and a future date)';
        if (f.includes('appointment_time')) return 'appointment time (must be HH:MM format)';
        return f;
      }).join(', ');
      
      // Add helpful message to ask for missing or invalid fields
      // Only add if not already asking in the response
      const alreadyAsking = cleanResponse.toLowerCase().includes('name') && 
                            cleanResponse.toLowerCase().includes('email');
      
      if (!alreadyAsking && bookingInfo.therapist_name) {
        let message = `\n\nTo complete your booking with **${bookingInfo.therapist_name}**, I need:`;
        if (missingFieldsList) {
          message += `\n- ${missingFieldsList}`;
        }
        if (invalidFieldsList) {
          message += `\n- Please correct: ${invalidFieldsList}`;
        }
        message += `\n\nCould you please provide these details?`;
        cleanResponse += message;
      }
    }
    
    // Validate booking info - all required fields must be present
    if (bookingInfo && allFieldsPresent) {
      try {
        // Final validation check before processing booking
        // Double-check all required fields are present and valid
        const finalValidation = {
          therapist_name: bookingInfo.therapist_name?.trim() || '',
          patient_name: bookingInfo.patient_name?.trim() || '',
          patient_email: bookingInfo.patient_email?.trim() || '',
          appointment_date: bookingInfo.appointment_date?.trim() || '',
          appointment_time: bookingInfo.appointment_time?.trim() || '',
        };
        
        // Validate each field one more time before booking
        if (!finalValidation.therapist_name || finalValidation.therapist_name.length === 0) {
          throw new Error('Therapist name is required for booking');
        }
        if (!finalValidation.patient_name || finalValidation.patient_name.length < 2) {
          throw new Error('Patient name must be at least 2 characters');
        }
        if (!finalValidation.patient_email || !isValidEmail(finalValidation.patient_email)) {
          throw new Error('Valid patient email is required for booking');
        }
        if (!finalValidation.appointment_date || !isValidDate(finalValidation.appointment_date)) {
          throw new Error('Valid appointment date (YYYY-MM-DD) is required for booking');
        }
        if (!finalValidation.appointment_time || !isValidTime(finalValidation.appointment_time)) {
          throw new Error('Valid appointment time (HH:MM) is required for booking');
        }
        
        // Final check: date must be in the future
        const appointmentDate = new Date(finalValidation.appointment_date);
        const now = new Date();
        const bufferMinutes = 30;
        const nowWithBuffer = new Date(now.getTime() + bufferMinutes * 60 * 1000);
        if (appointmentDate < nowWithBuffer) {
          throw new Error('Appointment date must be in the future');
        }
        
        console.log('✅ All validation checks passed - proceeding with booking');
        console.log('📅 Processing booking request...');
        console.log('📅 Full booking info:', JSON.stringify(bookingInfo, null, 2));
        
        // Find therapist by name (flexible matching) - reuse allActiveTherapists
        console.log('🔍 Searching for therapist:', bookingInfo.therapist_name);
        console.log('📋 Available therapists:', allActiveTherapists?.map((t: any) => t.name));
        
        // Try multiple matching strategies for better accuracy
        const therapistNameLower = bookingInfo.therapist_name.toLowerCase().trim();
        const therapist = allActiveTherapists?.find((t: any) => {
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
          console.error('📋 Available therapist names:', allActiveTherapists?.map((t: any) => t.name));
          
          // Build helpful error message with available therapists (ONLY from the 8 therapists in database)
          let errorMessage = `\n\n⚠️ I couldn't find a therapist named **"${bookingInfo.therapist_name}"** in the system.`;
          
          if (matchedTherapists && matchedTherapists.length > 0) {
            errorMessage += `\n\nHere are the **available therapists** I showed you earlier:\n\n`;
            matchedTherapists.slice(0, 5).forEach((t: any) => {
              errorMessage += `• **${t.name}**\n`;
            });
            errorMessage += `\nPlease select one of these therapists by name, and I'll help you book your appointment.`;
          } else if (allActiveTherapists && allActiveTherapists.length > 0) {
            errorMessage += `\n\nHere are the **therapists available** in our system (these are the only therapists we have):\n\n`;
            allActiveTherapists.forEach((t: any) => {
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
          // Use the supabaseUrl extracted at the start of the function
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
          
          if (!supabaseUrl || !supabaseServiceKey) {
            console.error('❌ Missing Supabase configuration:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
            throw new Error('Supabase configuration missing');
          }
          
          console.log('📅 Making booking API call to:', `${supabaseUrl}/functions/v1/book-appointment`);
          console.log('📅 Using service key (length):', supabaseServiceKey.length);
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
            
            // Replace entire response with clear booking confirmation
            cleanResponse = `✅ **Appointment Booked Successfully!**\n\n`;
            cleanResponse += `Your appointment has been confirmed and saved to our system.\n\n`;
            cleanResponse += `📅 **Date:** ${dateDisplay}\n`;
            cleanResponse += `⏰ **Time:** ${timeDisplay}\n`;
            cleanResponse += `👤 **Therapist:** ${therapist.name}\n`;
            cleanResponse += `📧 **Confirmation sent to:** ${finalPatientEmail}\n\n`;
            cleanResponse += `Your appointment details have been saved to the appointments table in Supabase. You'll receive a confirmation email shortly.`;
            
            console.log('✅ Booking completed successfully - appointment saved to database');
            console.log('✅ Appointment ID:', bookingResult.appointment.id);
            console.log('✅ Response updated with booking confirmation');
          // This block is now unreachable since we check !bookingResponse.ok above
          // But keeping it for safety
        }
      } catch (error: any) {
        console.error('❌ Error processing booking:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        cleanResponse += `\n\n⚠️ I encountered an error while booking your appointment: ${error.message}. Please try again or contact support.`;
      }
    } else if (bookingInfo) {
      // bookingInfo exists but missing required fields - already logged above
      // Don't add duplicate error message - let AI continue conversation naturally
    }

    // Build response object
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

  } catch (error: any) {
    console.error('❌ Error in handle-chat:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    
    // Safely extract error message
    let errorMessage = 'An error occurred';
    try {
      if (error?.message) {
        errorMessage = String(error.message);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } catch (e) {
      errorMessage = 'An unexpected error occurred';
    }
    
    // Check for common errors - provide helpful messages
    if (errorMessage.includes('quota') || errorMessage.includes('Quota') || errorMessage.includes('capacity') || errorMessage.includes('at capacity')) {
      errorMessage = 'Google Gemini free tier is at capacity. This is a temporary limit. Please wait 1-2 minutes and try again.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout') || errorMessage.includes('Request timeout')) {
      errorMessage = 'Request timeout. All Gemini models are currently at capacity. Please wait a moment and try again.';
    } else if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
      errorMessage = 'AI service configuration error. Please contact support.';
    } else if (errorMessage.includes('model') || errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
      errorMessage = 'AI model temporarily unavailable. Please try again in a moment.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    }
    
    // Return user-friendly error response
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        reply: 'I apologize, but I encountered a technical issue. Please try again in a moment, or contact support if the problem persists.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

