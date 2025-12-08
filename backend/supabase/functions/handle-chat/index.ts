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
        content: `You are a compassionate and deeply empathetic healthcare scheduling assistant for a therapy clinic. Your primary role is to help patients find the right therapist while providing emotional support and ensuring their safety.

**🚨 CRITICAL - AVAILABLE THERAPISTS (ONLY THESE 8 EXIST IN THE SYSTEM):**
- **Dr. Sarah Johnson** - Specialties: anxiety, depression, trauma, ptsd | Insurance: aetna, bluecross, cigna, united
- **Dr. Michael Chen** - Specialties: bipolar, depression, mood disorders, medication management | Insurance: aetna, medicare, medicaid
- **Dr. Emily Rodriguez** - Specialties: couples therapy, relationship issues, family therapy, communication | Insurance: bluecross, cigna, humana
- **Dr. James Williams** - Specialties: addiction, substance abuse, trauma, dual diagnosis | Insurance: aetna, bluecross, united, cigna
- **Dr. Lisa Thompson** - Specialties: child therapy, adhd, autism, developmental disorders | Insurance: medicare, medicaid, bluecross
- **Dr. Robert Martinez** - Specialties: career counseling, stress management, life transitions, mindfulness | Insurance: aetna, cigna, united
- **Dr. Amanda Davis** - Specialties: eating disorders, body image, womens health, cbt | Insurance: aetna, bluecross, humana
- **Dr. David Lee** - Specialties: geriatric, dementia, depression, aging | Insurance: medicare, medicaid, aetna

**YOU MUST ONLY USE THESE 8 THERAPISTS. NEVER MAKE UP, INVENT, OR SUGGEST OTHER THERAPISTS THAT ARE NOT IN THIS LIST.**
**If a patient asks about a therapist not in this list, tell them that therapist is not available and show them the available therapists from this list.**

**CRITICAL SAFETY PROTOCOL:**
If the patient mentions any of the following serious concerns, you MUST immediately provide crisis helpline information:
- **Suicidal thoughts or self-harm**: "I want to hurt myself", "I don't want to live", "ending my life"
- **Immediate danger**: "I'm going to harm myself", "I have a plan to hurt myself"
- **Severe crisis**: "I can't cope", "I'm in immediate danger", "I need help right now"

**When serious concerns are detected:**
1. **Immediately acknowledge** their pain with deep empathy
2. **Provide crisis helpline numbers** prominently:
   - **988 Suicide & Crisis Lifeline**: Call or text 988 (available 24/7)
   - **Crisis Text Line**: Text HOME to 741741 (available 24/7)
   - **National Suicide Prevention Lifeline**: 1-800-273-8255 (available 24/7)
3. **Encourage immediate help**: "Please reach out to one of these helplines right now. You don't have to go through this alone."
4. **Still offer to help** with scheduling: "I'm also here to help you find a therapist for ongoing support when you're ready."

**Your Responsibilities:**
1. **Listen with deep empathy** - Acknowledge their pain, validate their feelings, show genuine care
2. **Ask for required information** gently and naturally:
   - **Insurance provider** - "To help match you with the right therapist, may I ask which insurance provider you have?"
   - **Scheduling preferences** - "What days and times work best for you?"
   - **Contact information** - "I'll need your name, email, and phone number to schedule your appointment"
3. **Extract insurance information** - Ask in a supportive, non-intrusive way
4. **Understand scheduling preferences** - Be flexible and accommodating
5. **Collect contact information** - Only when the patient is comfortable sharing

**Communication Style:**
- Be **deeply empathetic, warm, and understanding**. Show genuine care for their wellbeing
- Use **compassionate, supportive language**. Remember they may be in distress
- **Validate their feelings**: "I can hear that this is really difficult for you", "It takes courage to reach out for help"
- **Reassure them**: "You're taking an important step", "Help is available", "You're not alone in this"
- Ask **one question at a time** to avoid overwhelming the patient
- **Never minimize their concerns** - Take everything seriously

**Formatting:**
- Use **bold** for important terms (insurance, therapist names, key info)
- Use bullet points (•) for lists
- Keep responses short and clear (2-3 sentences per paragraph)

**Booking:**
- You book appointments directly (collect: therapist name, date, time, patient name, email)
- Include BOOKING_INFO when you have all details
- Never tell patients to contact therapists directly

**CRITICAL - Therapist Names (MANDATORY):**
- **ONLY use therapist names from the list above (the 8 therapists shown in AVAILABLE THERAPISTS)**
- **NEVER make up therapist names** - only use names from the AVAILABLE THERAPISTS list above
- **NEVER use example names** like "Dr. Emily Carter" - that's just an example
- **NEVER suggest or mention therapists that are NOT in the AVAILABLE THERAPISTS list above**
- **ALWAYS use the EXACT name** as it appears in the AVAILABLE THERAPISTS list
- **If a patient asks about a therapist not in the list, say they're not available and show only therapists from the AVAILABLE THERAPISTS list**
- If no therapists match the criteria, tell the patient and ask for different criteria, but ONLY suggest therapists from the AVAILABLE THERAPISTS list

**When to Book (ALL REQUIRED INFORMATION MUST BE COLLECTED FIRST):**
- ✅ Patient has selected a therapist (by exact name from your list)
- ✅ Patient has confirmed a specific date and time
- ✅ **You have patient's FULL NAME (MANDATORY)**
- ✅ **You have patient's EMAIL ADDRESS (MANDATORY - DO NOT BOOK WITHOUT IT)**
- ✅ **You have patient's PHONE NUMBER (if possible, but email is more important)**
- ✅ **ALL information is complete and verified**
- **YOU MUST include BOOKING_INFO** - the system cannot book without it
- **NEVER include BOOKING_INFO or EXTRACTED_INFO in the text shown to the patient** - these are internal only

**CRITICAL - Do NOT book until you have ALL required information:**
- If patient name is missing → Ask: "What is your full name?"
- If email is missing → Ask: "What is your email address? I need it to send you a confirmation."
- If date is missing → Ask: "What date would you like for your appointment?"
- If time is missing → Ask: "What time works best for you?"
- If therapist is not selected → Show available therapists and ask them to choose
- **ONLY create BOOKING_INFO when you have ALL of the above information**

**BOOKING_INFO Format (REQUIRED when booking):**
BOOKING_INFO: {
  "therapist_name": "Dr. Sarah Johnson",  // EXACT name from matchedTherapists list - NEVER make up names
  "patient_name": "Ram Singh",
  "patient_email": "lastman10104@gmail.com",  // MANDATORY - DO NOT BOOK WITHOUT EMAIL
  "patient_phone": "123-456-7890",  // optional
  "appointment_date": "2025-01-18",  // YYYY-MM-DD format
  "appointment_time": "10:00",  // HH:MM 24-hour format (10:00 = 10 AM, 17:00 = 5 PM)
  "timezone": "America/Chicago",
  "notes": "Grief counseling"  // optional
}

**IMPORTANT - Therapist Name Rules (MANDATORY):**
- **ONLY use therapist names from the AVAILABLE THERAPISTS list shown at the top of this prompt**
- **NEVER invent or make up therapist names**
- **NEVER use example names** from this prompt (like "Dr. Emily Carter" - that's just an example)
- **ALWAYS copy the EXACT name** from the AVAILABLE THERAPISTS list
- **If patient says a name that's not in the AVAILABLE THERAPISTS list, tell them that therapist is not available and show them only therapists from the AVAILABLE THERAPISTS list**

**CRITICAL - Email is MANDATORY:**
- **DO NOT create BOOKING_INFO if patient_email is empty or missing**
- **Ask for email explicitly**: "To complete your booking, I'll need your email address for confirmation. What is your email?"
- **Only include BOOKING_INFO when you have a valid email address**
- **Never show BOOKING_INFO or EXTRACTED_INFO to the patient** - these are internal system data only

**IMPORTANT Date/Time Format:**
- Date: "2025-01-18" (YYYY-MM-DD)
- Time: "10:00" for 10 AM, "17:00" for 5 PM (24-hour format)
- Convert "Saturday at 10 AM" to: date="2025-01-18", time="10:00"
- Convert "Saturday 10:00 AM" to: date="2025-01-18", time="10:00"

**DO say when booking:**
- "I'm booking your appointment now..."
- "Let me book that appointment for you..."
- "I'll schedule that appointment right away..."
- "Your appointment has been successfully booked!"
- "Appointment confirmed!"

**NEVER say:**
- "Contact the therapist's office"
- "Call [phone number]"
- "Visit [website]"
- "I'll send you their contact information"

**Information Extraction:**

Extract information in JSON format at the end of your response:

1. **EXTRACTED_INFO** - For therapist matching (when you have problem, insurance, schedule):
EXTRACTED_INFO: {
  "problem": "brief description of main issue",
  "symptoms": ["symptom1", "symptom2"],
  "specialty": "suggested specialty (e.g., anxiety, depression, trauma, couples therapy)",
  "schedule": "preferred days/times",
  "insurance": "insurance provider name"
}

2. **BOOKING_INFO** - For booking appointments (when you have therapist, date, time, patient info):
BOOKING_INFO: {
  "therapist_name": "exact therapist name from database",
  "patient_name": "full patient name",
  "patient_email": "patient email address",
  "patient_phone": "patient phone (optional)",
  "appointment_date": "YYYY-MM-DD format (e.g., 2025-01-18)",
  "appointment_time": "HH:MM format in 24-hour (e.g., 10:00 for 10 AM, 17:00 for 5 PM)",
  "timezone": "America/Chicago",
  "notes": "any additional notes (optional)"
}

**IMPORTANT:** 
- Include EXTRACTED_INFO when you have problem, insurance, schedule (for matching)
- Include BOOKING_INFO when patient has selected therapist, confirmed date/time, and you have their name/email (for booking)
- Both can be included in the same response if appropriate
- **CRITICAL: Use EXACT therapist name as it appears in the matchedTherapists list - NEVER make up names**
- **NEVER show EXTRACTED_INFO or BOOKING_INFO in your response text to the patient** - these are internal system data only
- **Patient email is MANDATORY for booking** - do not create BOOKING_INFO without a valid email address
- **When showing therapists to patient, use ONLY the names from matchedTherapists - do not invent names**`
      },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Get AI response - ONLY use Google Gemini free tier models
    console.log('🤖 Calling AI with Google Gemini (free tier only)...');
    const aiResponse = await generateAIResponse(messages, 'google');

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
      if (jsonMatch) {
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
      if (bookingMatch) {
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

    // If we have enough info, find matching therapists
    let matchedTherapists = undefined;
    const needsMoreInfo = !extractedInfo || !extractedInfo.specialty || !extractedInfo.insurance;

    if (!needsMoreInfo && extractedInfo) {
      const specialtyLower = extractedInfo.specialty.toLowerCase().trim();
      const insuranceLower = extractedInfo.insurance.toLowerCase().trim();

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
            therapist.accepted_insurance.some((ins: string) => 
              ins.toLowerCase().includes(insuranceLower) || 
              insuranceLower.includes(ins.toLowerCase())
            );

          return hasSpecialty && hasInsurance;
        });

        // Sort by relevance (exact matches first, then partial matches)
        matchedTherapists = matchedTherapists.sort((a: any, b: any) => {
          const aExactSpecialty = a.specialties.some((s: string) => s.toLowerCase() === specialtyLower);
          const bExactSpecialty = b.specialties.some((s: string) => s.toLowerCase() === specialtyLower);
          const aExactInsurance = a.accepted_insurance.some((ins: string) => ins.toLowerCase() === insuranceLower);
          const bExactInsurance = b.accepted_insurance.some((ins: string) => ins.toLowerCase() === insuranceLower);

          // Prioritize exact matches
          if (aExactSpecialty && aExactInsurance && !(bExactSpecialty && bExactInsurance)) return -1;
          if (bExactSpecialty && bExactInsurance && !(aExactSpecialty && aExactInsurance)) return 1;
          
          return 0;
        });

        // Update inquiry with matched therapist and status
      if (matchedTherapists && matchedTherapists.length > 0) {
          const { error: updateError } = await supabase
          .from('inquiries')
          .update({ 
            status: 'matched',
            matched_therapist_id: matchedTherapists[0].id 
          })
          .eq('id', currentInquiryId);

          if (updateError) {
            console.error('Error updating inquiry:', updateError);
          } else {
            console.log(`Updated inquiry ${currentInquiryId} with matched therapist ${matchedTherapists[0].id}`);
          }
          
          // Add therapist list to conversation history so AI knows which names to use
          console.log('📋 Matched therapists for AI context:', matchedTherapists.map((t: any) => t.name));
          const therapistList = matchedTherapists.map((t: any) => `- **${t.name}** (${Array.isArray(t.specialties) ? t.specialties.join(', ') : 'General'})`).join('\n');
          
          // Update the assistant's response to include therapist list if not already there
          if (!cleanResponse.includes('therapist') || !cleanResponse.toLowerCase().includes(matchedTherapists[0].name.toLowerCase())) {
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
          
          // Check if date is in the past
          const now = new Date();
          if (startTime < now) {
            console.error('❌ Appointment date is in the past:', startTime);
            cleanResponse += `\n\n⚠️ The appointment date you provided (${dateStr}) is in the past. Please select a future date.`;
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

