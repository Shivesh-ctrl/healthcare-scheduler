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
 * NATURAL CONVERSATION FLOW:
 * 1. Answer user's question FIRST (insurance, problem, therapy type)
 * 2. Show therapists in chat (limit to 4, unless asked for more)
 * 3. Gather information naturally, one by one
 * 4. When user selects a therapist, proceed to booking
 * 5. Update appointment table when booking is confirmed
 */

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 QUERY DETECTION - Understand what user is asking
// ─────────────────────────────────────────────────────────────────────────────

interface QueryIntent {
  type: 'insurance' | 'problem' | 'therapy_type' | 'therapist_list' | 'insurance_list' | 'general';
  value?: string; // The insurance name, problem, or therapy type mentioned
  wantsMore?: boolean; // If user explicitly asks for more than 4 therapists
  wantsAll?: boolean; // If user explicitly asks for ALL (no limit)
}

function detectQueryIntent(message: string): QueryIntent {
  const msgLower = message.toLowerCase().trim();
  
  // Check for insurance mentions
  const insuranceNames = ['aetna', 'blue cross', 'bluecross', 'bcbs', 'cigna', 'united', 'medicare', 'medicaid', 'humana'];
  let mentionedInsurance: string | null = null;
  for (const ins of insuranceNames) {
    if (msgLower.includes(ins)) {
      mentionedInsurance = ins;
      break;
    }
  }
  
  // Check for therapy type mentions
  const therapyTypes = ['cbt', 'cognitive behavioral', 'emdr', 'dbt', 'dialectical behavioral', 'trauma', 'grief', 'anxiety', 'depression'];
  let mentionedTherapyType: string | null = null;
  for (const therapy of therapyTypes) {
    if (msgLower.includes(therapy)) {
      mentionedTherapyType = therapy;
      break;
    }
  }
  
  // Check for problem mentions (anxiety, depression, stress, trauma, etc.)
  const problems = ['anxiety', 'depression', 'stress', 'trauma', 'grief', 'relationship', 'marriage', 'family', 'addiction', 'substance'];
  let mentionedProblem: string | null = null;
  for (const problem of problems) {
    if (msgLower.includes(problem)) {
      mentionedProblem = problem;
      break;
    }
  }
  
  // Check if asking for therapist list
  const askingForTherapistList = 
    msgLower.includes('show') && (msgLower.includes('therapist') || msgLower.includes('therapists')) ||
    msgLower.includes('list') && (msgLower.includes('therapist') || msgLower.includes('therapists')) ||
    msgLower.includes('who') && (msgLower.includes('therapist') || msgLower.includes('therapists')) ||
    msgLower.includes('find') && (msgLower.includes('therapist') || msgLower.includes('therapists'));
  
  // Check if asking for insurance list
  const askingForInsuranceList = 
    msgLower.includes('insurance') && (msgLower.includes('list') || msgLower.includes('show') || msgLower.includes('what') || msgLower.includes('which'));
  
  // Check if wants more than 4 therapists or all
  const wantsAll = msgLower.includes('all') || msgLower.includes('show all') || msgLower.includes('every') || msgLower.includes('complete list');
  const wantsMore = wantsAll || msgLower.includes('more');
  
  // Priority: insurance query > therapy type > problem > general list
  if (mentionedInsurance && (msgLower.includes('therapist') || msgLower.includes('who') || msgLower.includes('accept'))) {
    return { type: 'insurance', value: mentionedInsurance, wantsMore, wantsAll };
  }
  
  if (mentionedTherapyType && (msgLower.includes('therapist') || msgLower.includes('who') || msgLower.includes('do'))) {
    return { type: 'therapy_type', value: mentionedTherapyType, wantsMore, wantsAll };
  }
  
  if (mentionedProblem && (msgLower.includes('therapist') || msgLower.includes('who') || msgLower.includes('treat'))) {
    return { type: 'problem', value: mentionedProblem, wantsMore, wantsAll };
  }
  
  if (askingForInsuranceList) {
    return { type: 'insurance_list', wantsAll };
  }
  
  if (askingForTherapistList) {
    return { type: 'therapist_list', wantsMore, wantsAll };
  }
  
  return { type: 'general' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎯 FIND THERAPISTS - Dynamic matching based on criteria
// ─────────────────────────────────────────────────────────────────────────────

function normalizeInsurance(ins: string): string {
  if (!ins) return '';
  const normalized = ins.toLowerCase().trim();
  if (normalized.includes('blue cross') || normalized.includes('bcbs') || normalized.includes('bluecross')) {
    return 'blue cross blue shield';
  }
  if (normalized.includes('aetna')) return 'aetna';
  if (normalized.includes('cigna')) return 'cigna';
  if (normalized.includes('united')) return 'united';
  if (normalized.includes('medicare')) return 'medicare';
  if (normalized.includes('medicaid')) return 'medicaid';
  if (normalized.includes('humana')) return 'humana';
  return normalized;
}

function normalizeSpecialty(spec: string): string {
  if (!spec) return '';
  const normalized = spec.toLowerCase().trim();
  if (normalized.includes('cbt') || normalized.includes('cognitive behavioral')) return 'cbt';
  if (normalized.includes('emdr') || normalized.includes('eye movement')) return 'emdr';
  if (normalized.includes('dbt') || normalized.includes('dialectical')) return 'dbt';
  return normalized;
}

async function findMatchingTherapists(
  supabase: any,
  criteria: {
    insurance?: string;
    problem?: string;
    therapyType?: string;
  },
  limit: number = 4
): Promise<any[]> {
  const { data: allTherapists } = await supabase
      .from('therapists')
      .select('*')
      .eq('is_active', true);
    
  if (!allTherapists || allTherapists.length === 0) return [];

  let matching = allTherapists;

  // Filter by insurance
  if (criteria.insurance) {
    const insuranceNormalized = normalizeInsurance(criteria.insurance);
    matching = matching.filter((therapist: any) => {
      if (!therapist.accepted_insurance || !Array.isArray(therapist.accepted_insurance)) return false;
      return therapist.accepted_insurance.some((ins: string) => {
        const insNormalized = normalizeInsurance(ins);
        return insNormalized.includes(insuranceNormalized) || 
               insuranceNormalized.includes(insNormalized);
      });
    });
  }

  // Filter by problem
  if (criteria.problem) {
    const problemLower = criteria.problem.toLowerCase();
    matching = matching.filter((therapist: any) => {
      const hasSpecialty = therapist.specialties && 
        Array.isArray(therapist.specialties) &&
        therapist.specialties.some((s: string) => 
          s.toLowerCase().includes(problemLower) || 
          problemLower.includes(s.toLowerCase())
        );
      const bioMatch = therapist.bio && 
        therapist.bio.toLowerCase().includes(problemLower);
      return hasSpecialty || bioMatch;
    });
  }

  // Filter by therapy type
  if (criteria.therapyType) {
    const therapyNormalized = normalizeSpecialty(criteria.therapyType);
    matching = matching.filter((therapist: any) => {
      const hasSpecialty = therapist.specialties && 
        Array.isArray(therapist.specialties) &&
        therapist.specialties.some((s: string) => {
          const sNormalized = normalizeSpecialty(s);
          return sNormalized.includes(therapyNormalized) || 
                 therapyNormalized.includes(sNormalized);
        });
      const bioMatch = therapist.bio && 
        therapist.bio.toLowerCase().includes(therapyNormalized);
      return hasSpecialty || bioMatch;
    });
  }

  return matching.slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 AI RESPONSE GENERATION - Natural, human-like conversation
// ─────────────────────────────────────────────────────────────────────────────

async function generateAIResponse(
  userMessage: string,
  conversationHistory: any[] = [],
  context: {
    queryIntent?: QueryIntent;
    matchedTherapists?: any[];
    extractedInfo?: any;
    missingFields?: string[];
    isLoggedIn?: boolean;
  } = {}
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

  // Build therapist info if available
  let therapistInfo = '';
  if (context.matchedTherapists && context.matchedTherapists.length > 0) {
    const isShowingAll = context.queryIntent?.wantsAll || false;
    therapistInfo = `\n\nTHERAPISTS TO SHOW TO USER (display these with proper formatting):\n`;
    context.matchedTherapists.forEach((t: any, idx: number) => {
      therapistInfo += `${idx + 1}. **${t.name}**\n`;
      if (t.bio) therapistInfo += `   ${t.bio}\n`;
      if (t.specialties && Array.isArray(t.specialties)) {
        therapistInfo += `   **Specialties:** ${t.specialties.map(s => `• ${s}`).join(' ')}\n`;
      }
      therapistInfo += `\n`;
    });
    if (isShowingAll) {
      therapistInfo += `\nCRITICAL: The user asked to see ALL therapists. You MUST display ALL ${context.matchedTherapists.length} therapists listed above. Do not stop early or limit the display.\n`;
    }
    therapistInfo += `\nFORMATTING INSTRUCTIONS:
- Use **bold** for therapist names (e.g., **Jasmine Goins, LCSW**)
- Use bullet points (•) for specialties list
- Keep bio text in regular format
- Make it visually appealing and easy to read
- Number each therapist clearly (1., 2., 3., etc.)
- Example format:
  1. **Therapist Name**
     Bio text here
     **Specialties:** • specialty1 • specialty2 • specialty3\n`;
  }

  // Build system prompt
  let prompt = `You are a warm, empathetic, and understanding scheduling assistant helping users find therapists and book appointments. You sound like a caring friend who genuinely wants to help.

YOUR CORE PRINCIPLES:
1. ALWAYS answer the user's question FIRST - never ask for information before answering what they asked
2. Be deeply empathetic - acknowledge their situation, show genuine understanding ("I understand", "That sounds difficult", "I'm here to help")
3. Sound natural and human - avoid robotic lists, use conversational language
4. Gather information ONE thing at a time - never overwhelm with multiple questions
5. NEVER ask for information the user already provided - check the "INFORMATION WE ALREADY HAVE" section below and NEVER ask for anything marked with ✓
6. Show therapists naturally in your response - don't use placeholders or say "here are therapists"
7. Keep everything in the chat - don't mention booking forms or external pages
8. USE PROPER FORMATTING: When displaying therapists, use **bold** for names, bullet points (•) for specialties, and clear structure for readability

CURRENT USER MESSAGE: ${userMessage}

`;

  if (conversationContext) {
    prompt += `PREVIOUS CONVERSATION:\n${conversationContext}\n\n`;
  }

  // Add context about what we know
  if (context.extractedInfo) {
    prompt += `INFORMATION WE ALREADY HAVE FROM THE USER (DO NOT ASK FOR THESE AGAIN):\n`;
    if (context.extractedInfo.name) prompt += `- Name: ${context.extractedInfo.name} ✓\n`;
    if (context.extractedInfo.insurance) prompt += `- Insurance: ${context.extractedInfo.insurance} ✓\n`;
    if (context.extractedInfo.problem) prompt += `- Problem/concern: ${context.extractedInfo.problem} ✓\n`;
    if (context.extractedInfo.preferred_time) prompt += `- Preferred time: ${context.extractedInfo.preferred_time} ✓\n`;
    if (context.extractedInfo.day_type) prompt += `- Day preference: ${context.extractedInfo.day_type} ✓\n`;
    if (context.extractedInfo.email) prompt += `- Email: ${context.extractedInfo.email} ✓\n`;
    prompt += `\nCRITICAL: The user has already provided the information marked with ✓ above. NEVER ask for this information again. Only ask for information that is NOT in this list.\n\n`;
  }

  // Add therapist info if available
  if (therapistInfo) {
    prompt += therapistInfo;
    prompt += `\nCRITICAL: Display ALL ${context.matchedTherapists!.length} therapists above in your response. Show their full name, bio, and specialties. Number them clearly. 

AFTER SHOWING THERAPISTS:
- Give a warm, empathetic response acknowledging their situation (e.g., "I know this is a difficult time, and I'm here to support you")
- Then ask for their preferred day and time (e.g., "When would you like to schedule your appointment? For example, you could say 'next Monday morning' or 'Tuesday afternoon'")
- Do NOT ask them to choose a therapist by name - they can mention the therapist name when they provide the day/time, or you can help them book with any of the therapists shown
- Be natural and conversational - don't use robotic language\n`;
  }

  // Determine what to do next
  if (context.queryIntent) {
    if (context.queryIntent.type === 'insurance' || context.queryIntent.type === 'problem' || context.queryIntent.type === 'therapy_type') {
      prompt += `\nThe user asked about ${context.queryIntent.type === 'insurance' ? 'therapists who accept ' + context.queryIntent.value : context.queryIntent.type === 'therapy_type' ? 'therapists who do ' + context.queryIntent.value : 'therapists who treat ' + context.queryIntent.value}. 

FORMAT THE RESPONSE LIKE THIS:
- Start with a warm, empathetic acknowledgment of their situation (e.g., "I'm so sorry to hear you're going through [problem]. That sounds incredibly difficult, and I want you to know I'm here to help you find the support you need.")
- Display therapists using **bold** for names, bullet points for specialties
- Example format:
  "I'm so sorry to hear you're going through [problem]. That sounds incredibly difficult, and I want you to know I'm here to help you find the support you need.
  
  Based on what you've shared, here are some therapists who might be a good fit for you:
  
  1. **Therapist Name**
     [Bio text here]
     **Specialties:** • specialty1 • specialty2 • specialty3
  
  2. **Therapist Name**
     [Bio text here]
     **Specialties:** • specialty1 • specialty2
  
  [Continue for all therapists]
  
  When would you like to schedule your appointment? For example, you could say 'next Monday morning' or 'Tuesday afternoon'."

After showing therapists, ask for their preferred day and time in a warm, empathetic way. Do NOT ask them to choose a therapist by name.\n`;
    } else if (context.queryIntent.type === 'insurance_list') {
      prompt += `\nThe user asked for a list of accepted insurance. Provide it with proper formatting using bullet points, then ask for ONE piece of information to help them find a therapist.\n`;
    } else if (context.queryIntent.type === 'therapist_list') {
      prompt += `\nThe user asked for a list of therapists. Show them the therapists listed above with proper formatting (bold names, bullet points for specialties), then ask for ONE piece of missing information.\n`;
    }
  }

  if (context.missingFields && context.missingFields.length > 0) {
    const fieldsToAsk = context.isLoggedIn ? context.missingFields.filter(f => f !== 'email') : context.missingFields;
    const fieldMap: Record<string, string> = {
      'name': 'their name',
      'preferred_time': 'when they prefer appointments (morning, afternoon, evening)',
      'day_type': 'which days work best for them',
      'email': 'their email address',
      'insurance': 'their insurance provider'
    };
    
    const firstMissingField = fieldsToAsk[0];
    const fieldLabel = fieldMap[firstMissingField] || firstMissingField;
    
    // If therapists are shown and we need day/time, prioritize asking for that
    if (context.matchedTherapists && context.matchedTherapists.length > 0 && (firstMissingField === 'preferred_time' || firstMissingField === 'day_type')) {
      prompt += `\nAfter showing the therapists with empathy, ask for their preferred day and time. Be warm and natural. For example: "When would you like to schedule your appointment? For example, you could say 'next Monday morning' or 'Tuesday afternoon'."
    
CRITICAL REMINDER: Check the "INFORMATION WE ALREADY HAVE" section above. DO NOT ask for any information that is already marked with ✓.\n`;
    } else if (context.matchedTherapists && context.matchedTherapists.length > 0) {
      // If therapists shown but need other info (like name), still ask naturally
      prompt += `\nAfter showing the therapists, ask for ONLY ONE thing: ${fieldLabel}. Be warm, empathetic, and natural. Don't use bullet points or lists when asking.
    
CRITICAL REMINDER: Check the "INFORMATION WE ALREADY HAVE" section above. DO NOT ask for any information that is already marked with ✓.\n`;
    } else {
      prompt += `\nAsk for ONLY ONE thing: ${fieldLabel}. Be warm, empathetic, and natural. Don't use bullet points or lists when asking.
    
CRITICAL REMINDER: Check the "INFORMATION WE ALREADY HAVE" section above. DO NOT ask for any information that is already marked with ✓.\n`;
    }
  } else if (context.matchedTherapists && context.matchedTherapists.length > 0) {
    prompt += `\nAll required information is present. Confirm naturally and ask if they'd like to book with one of the therapists shown above.\n`;
  }

  // Emergency helplines
  prompt += `\nIf user mentions crisis/emergency/suicidal thoughts, immediately provide:
• 988 (Suicide & Crisis Lifeline - call or text)
• Crisis Text Line: 741741
• National Suicide Prevention Lifeline: 1-800-273-8255\n`;

  const tokenLimit = context.matchedTherapists && context.matchedTherapists.length > 0 ? 2000 : 500;

  try {
    if (Deno.env.get('GOOGLE_AI_API_KEY')) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: tokenLimit },
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
          max_tokens: tokenLimit,
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

// ─────────────────────────────────────────────────────────────────────────────
// 📝 EXTRACT INFORMATION - Get user details from conversation
// ─────────────────────────────────────────────────────────────────────────────

async function extractAppointmentInfoWithAI(
  userMessage: string,
  conversationHistory: any[] = []
): Promise<{
  name: string;
  preferred_time: string;
  day_type: string;
  specific_date: string;
  email: string;
  insurance: string;
  problem: string;
}> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('AI API key not configured');

  let conversationContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg: any) => {
      if (msg.role === 'user') conversationContext += `User: ${msg.content}\n`;
      else if (msg.role === 'assistant') conversationContext += `Assistant: ${msg.content}\n`;
    });
  }

  const prompt = `Extract appointment details from this conversation. Return ONLY a JSON object with these keys:
{
  "name": "<full name or empty string>",
  "preferred_time": "<morning/afternoon/evening or specific time (e.g. '9am', '2pm', '10:00') or empty string>",
  "day_type": "<weekday/weekend/specific day (e.g. 'monday', 'tuesday', 'next monday') or empty string>",
  "specific_date": "<specific date mentioned (e.g. '2025-12-15', 'next monday', 'december 15') or empty string>",
  "email": "<email address or empty string>",
  "insurance": "<insurance provider name (e.g. Aetna, BCBS) or empty string - DO NOT extract plan types like PPO/HMO>",
  "problem": "<problem/concern or therapy type/specialty or empty string>"
}

User message: ${userMessage}${conversationContext ? '\n\nPrevious conversation:\n' + conversationContext : ''}

Return only the JSON object, no other text.`;

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
    console.error('❌ Extraction error:', err);
    return { name: '', preferred_time: '', day_type: '', specific_date: '', email: '', insurance: '', problem: '' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 📅 DATE/TIME PARSING - Convert natural language to dates
// ─────────────────────────────────────────────────────────────────────────────

function parseNaturalDate(dateStr: string): { date: Date | null; time: string | null } {
  if (!dateStr) return { date: null, time: null };
  
  const lower = dateStr.toLowerCase().trim();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Parse "next monday", "next tuesday", etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    if (lower.includes(`next ${dayNames[i]}`)) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7; // Next week
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysToAdd);
      return { date: nextDate, time: null };
    }
    if (lower.includes(dayNames[i]) && !lower.includes('next')) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7; // This week or next
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysToAdd);
      return { date: nextDate, time: null };
    }
  }
  
  // Parse specific dates like "december 15", "12/15/2025"
  const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    return { date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)), time: null };
  }
  
  return { date: null, time: null };
}

function parseTime(timeStr: string): string | null {
  if (!timeStr) return null;
  
  const lower = timeStr.toLowerCase().trim();
  
  // Morning, afternoon, evening
  if (lower.includes('morning')) return '09:00';
  if (lower.includes('afternoon')) return '14:00';
  if (lower.includes('evening')) return '17:00';
  
  // Specific times like "9am", "2pm", "10:00"
  const timeMatch = lower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3];
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 📅 CHECK AVAILABILITY - Check if therapist is available
// ─────────────────────────────────────────────────────────────────────────────

async function checkTherapistAvailability(
  supabase: any,
  therapistId: string,
  date: Date,
  time: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    // Check if therapist exists and has calendar connected
    const { data: therapist } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', therapistId)
      .single();
    
    if (!therapist) {
      return { available: false, reason: 'Therapist not found' };
    }
    
    // Check existing appointments
    const startDateTime = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    startDateTime.setHours(hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour
    
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('therapist_id', therapistId)
      .gte('start_time', startDateTime.toISOString())
      .lt('start_time', endDateTime.toISOString());
    
    if (existingAppointments && existingAppointments.length > 0) {
      return { available: false, reason: 'Time slot already booked' };
    }
    
    // Basic availability check (9am-5pm, weekdays)
    const dayOfWeek = startDateTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { available: false, reason: 'Weekend appointments may not be available' };
    }
    
    const hour = startDateTime.getHours();
    if (hour < 9 || hour >= 17) {
      return { available: false, reason: 'Outside business hours (9am-5pm)' };
    }
    
    return { available: true };
  } catch (err) {
    console.error('❌ Availability check error:', err);
    return { available: false, reason: 'Error checking availability' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎯 MAIN HANDLER - Natural conversation flow
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  console.log('🚀 handle-chat function called');

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

    // Load existing inquiry
    let currentInquiryId = inquiryId;
    let inquiry: any = null;
    if (currentInquiryId) {
      const { data: inqData, error: inqErr } = await supabase.from('inquiries').select('*').eq('id', currentInquiryId).single();
      if (!inqErr && inqData) inquiry = inqData;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Detect what user is asking
    // ─────────────────────────────────────────────────────────────────────────────
    const queryIntent = detectQueryIntent(message);
    console.log('🔍 Query intent:', queryIntent);

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Answer their question FIRST
    // ─────────────────────────────────────────────────────────────────────────────

    // Handle insurance list request
    if (queryIntent.type === 'insurance_list') {
      const { data: allTherapists } = await supabase
        .from('therapists')
        .select('accepted_insurance')
        .eq('is_active', true);

      const allInsurances = new Set<string>();
      if (allTherapists) {
        allTherapists.forEach((t: any) => {
          if (Array.isArray(t.accepted_insurance)) {
            t.accepted_insurance.forEach((ins: string) => allInsurances.add(ins));
          }
        });
      }

      const insuranceList = Array.from(allInsurances).sort();
      const insuranceListMessage = queryIntent.wantsAll 
        ? `Here are ALL the insurance plans we accept:\n\n${insuranceList.map(ins => `• ${ins}`).join('\n')}\n\nAll our therapists accept these insurance plans. To help you find the right therapist, could you share your name?`
        : `Here are the insurance plans we accept:\n\n${insuranceList.map(ins => `• ${ins}`).join('\n')}\n\nAll our therapists accept these insurance plans. To help you find the right therapist, could you share your name?`;

      const newHistory = [
        ...(conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: insuranceListMessage, timestamp: new Date().toISOString() },
      ];

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
        console.error('❌ DB error:', dbErr);
      }

      return new Response(JSON.stringify({
        reply: insuranceListMessage,
        inquiryId: currentInquiryId || '',
        extractedInfo: undefined,
        needsMoreInfo: true,
        matchedTherapists: undefined,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle specific queries (insurance, problem, therapy type)
    if (queryIntent.type === 'insurance' || queryIntent.type === 'problem' || queryIntent.type === 'therapy_type') {
      const limit = queryIntent.wantsAll ? 999 : (queryIntent.wantsMore ? 10 : 4);
      
      const criteria: any = {};
      if (queryIntent.type === 'insurance' && queryIntent.value) {
        criteria.insurance = queryIntent.value;
      } else if (queryIntent.type === 'problem' && queryIntent.value) {
        criteria.problem = queryIntent.value;
      } else if (queryIntent.type === 'therapy_type' && queryIntent.value) {
        criteria.therapyType = queryIntent.value;
      }

      const matchedTherapists = await findMatchingTherapists(supabase, criteria, limit);

      if (matchedTherapists.length > 0) {
        // Generate natural AI response with therapists
        // After showing therapists, ask for day/time (not name)
        const aiResponse = await generateAIResponse(message, conversationHistory, {
          queryIntent,
          matchedTherapists,
          missingFields: ['preferred_time', 'day_type'],
          isLoggedIn: !!patientIdentifier,
        });

        const newHistory = [
          ...(conversationHistory || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() },
        ];

        const inquiryData: any = {
          problem_description: message,
          conversation_history: newHistory,
          status: 'pending',
        };
        if (queryIntent.type === 'insurance' && queryIntent.value) {
          inquiryData.insurance_info = queryIntent.value;
        }
        if (queryIntent.type === 'problem' && queryIntent.value) {
          inquiryData.extracted_specialty = queryIntent.value;
        }
        if (patientIdentifier) inquiryData.patient_identifier = patientIdentifier;

        try {
          if (!currentInquiryId) {
            const { data: newInq } = await supabase.from('inquiries').insert(inquiryData).select().single();
            if (newInq) currentInquiryId = newInq.id;
          } else {
            await supabase.from('inquiries').update(inquiryData).eq('id', currentInquiryId);
          }
        } catch (dbErr) {
          console.error('❌ DB error:', dbErr);
        }

        return new Response(JSON.stringify({
          reply: aiResponse,
          inquiryId: currentInquiryId || '',
          extractedInfo: undefined,
          needsMoreInfo: true,
          matchedTherapists: matchedTherapists.map((t: any) => ({
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
          })),
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
        // No therapists found
        const noMatchMessage = `I'm sorry, I couldn't find any therapists matching your criteria. Could you try with different insurance or specialty?`;
        
        const newHistory = [
          ...(conversationHistory || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: noMatchMessage, timestamp: new Date().toISOString() },
        ];

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
          console.error('❌ DB error:', dbErr);
        }

        return new Response(JSON.stringify({
          reply: noMatchMessage,
          inquiryId: currentInquiryId || '',
          extractedInfo: undefined,
          needsMoreInfo: true,
          matchedTherapists: undefined,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Handle general therapist list request
    if (queryIntent.type === 'therapist_list') {
      const limit = queryIntent.wantsAll ? 999 : (queryIntent.wantsMore ? 10 : 4);
      const matchedTherapists = await findMatchingTherapists(supabase, {}, limit);

      if (matchedTherapists.length > 0) {
        const aiResponse = await generateAIResponse(message, conversationHistory, {
          queryIntent,
          matchedTherapists,
          missingFields: ['name', 'insurance', 'preferred_time', 'day_type'],
          isLoggedIn: !!patientIdentifier,
        });

        const newHistory = [
          ...(conversationHistory || []),
      { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() },
    ];

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
          console.error('❌ DB error:', dbErr);
        }

        return new Response(JSON.stringify({
          reply: aiResponse,
          inquiryId: currentInquiryId || '',
          extractedInfo: undefined,
          needsMoreInfo: true,
          matchedTherapists: matchedTherapists.map((t: any) => ({
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
          })),
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Extract information and gather missing details
    // ─────────────────────────────────────────────────────────────────────────────

    // Extract information from message
    let extracted: {
      name: string;
      preferred_time: string;
      day_type: string;
      specific_date: string;
      email: string;
      insurance: string;
      problem: string;
    } = { name: '', preferred_time: '', day_type: '', specific_date: '', email: '', insurance: '', problem: '' };

    // Load from existing inquiry
    if (inquiry) {
      extracted.name = inquiry.patient_name || '';
      extracted.email = inquiry.patient_email || '';
      extracted.preferred_time = inquiry.requested_schedule || '';
      extracted.insurance = inquiry.insurance_info || '';
      extracted.problem = inquiry.extracted_specialty || '';
    }

    // Extract new information
    try {
      const newExtracted = await extractAppointmentInfoWithAI(message, conversationHistory);
      extracted = {
        name: newExtracted.name || extracted.name,
        preferred_time: newExtracted.preferred_time || extracted.preferred_time,
        day_type: newExtracted.day_type || extracted.day_type,
        specific_date: newExtracted.specific_date || extracted.specific_date,
        email: newExtracted.email || extracted.email,
        insurance: newExtracted.insurance || extracted.insurance,
        problem: newExtracted.problem || extracted.problem,
      };
    } catch (err) {
      console.error('❌ Extraction failed:', err);
    }

    // Parse date/time if user mentioned specific date/time
    // Check the full message for combined phrases like "next monday morning"
    let parsedDate: Date | null = null;
    let parsedTime: string | null = null;
    
    // First, try to parse from the full message for combined phrases
    const fullMessage = message.toLowerCase();
    if (fullMessage.includes('next') && (fullMessage.includes('monday') || fullMessage.includes('tuesday') || fullMessage.includes('wednesday') || fullMessage.includes('thursday') || fullMessage.includes('friday') || fullMessage.includes('saturday') || fullMessage.includes('sunday'))) {
      const dateResult = parseNaturalDate(message);
      parsedDate = dateResult.date;
      // Also check for time in the same message
      parsedTime = parseTime(message) || parseTime(extracted.preferred_time);
    } else if (extracted.specific_date || extracted.day_type || extracted.preferred_time) {
      const dateResult = parseNaturalDate(extracted.specific_date || extracted.day_type || message);
      parsedDate = dateResult.date;
      parsedTime = parseTime(extracted.preferred_time || message) || dateResult.time;
    }

    // Check if user mentioned a therapist name (for booking)
    const messageLower = message.toLowerCase();
    let selectedTherapistId: string | null = null;
    
    // If we have matched therapists, check if user mentioned one by name
    if (inquiry?.matched_therapist_id) {
      selectedTherapistId = inquiry.matched_therapist_id;
    } else {
      // Try to find therapist by name in message
      const { data: allTherapists } = await supabase
        .from('therapists')
        .select('id, name')
        .eq('is_active', true);

      if (allTherapists) {
        const mentionedTherapist = allTherapists.find((t: any) => {
          const therapistNameLower = t.name.toLowerCase();
          const nameParts = therapistNameLower.split(',').map((p: string) => p.trim());
          const mainName = nameParts[0] || '';
          return messageLower.includes(therapistNameLower) ||
                 (mainName && messageLower.includes(mainName)) ||
                 (mainName.split(' ').some((word: string) => word.length > 3 && messageLower.includes(word)));
        });
        
        if (mentionedTherapist) {
          selectedTherapistId = mentionedTherapist.id;
          // Update inquiry with selected therapist
          if (currentInquiryId) {
            await supabase.from('inquiries').update({
              matched_therapist_id: selectedTherapistId,
            }).eq('id', currentInquiryId);
            inquiry = { ...inquiry, matched_therapist_id: selectedTherapistId };
          }
        }
      }
    }
    
    // Check if user wants to book (mentions therapist name or says "book")
    const wantsToBook = messageLower.includes('book') || 
                        messageLower.includes('schedule') ||
                        messageLower.includes('appointment') ||
                        (messageLower.includes('i want') && messageLower.includes('therapist')) ||
                        (selectedTherapistId && (parsedDate || parsedTime));

    // If user wants to book and we have a therapist selected, check availability and book
    if (wantsToBook && parsedDate && parsedTime && selectedTherapistId) {
      const therapistId = selectedTherapistId;
      const availability = await checkTherapistAvailability(supabase, therapistId, parsedDate, parsedTime);
      
      if (availability.available) {
        // Book the appointment directly in chat
        const startDateTime = new Date(parsedDate);
        const [hours, minutes] = parsedTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
        
        // Call book-appointment function internally
        try {
          // Book appointment directly in chat (no separate page needed)
          const { GoogleCalendarService } = await import('../_shared/google-calendar.ts');
          
          // Get therapist info
          const { data: therapist } = await supabase
            .from('therapists')
            .select('*')
            .eq('id', therapistId)
            .single();
          
          if (!therapist) {
            throw new Error('Therapist not found');
          }
          
          // Create appointment in database
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
          const { data: newAppointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
              inquiry_id: currentInquiryId,
              therapist_id: therapistId,
              patient_name: extracted.name || inquiry.patient_name,
              patient_email: extracted.email || inquiry.patient_email,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              status: 'confirmed',
            })
            .select()
            .single();
          
          if (appointmentError) throw appointmentError;
          
          // Create Google Calendar event if therapist has calendar connected
          if (therapist.google_calendar_id && therapist.google_refresh_token) {
            try {
              const calendarService = new GoogleCalendarService();
              const googleEventId = await calendarService.createEvent(
                therapist.google_calendar_id,
                therapist.google_refresh_token,
                {
                  summary: `Therapy Session - ${extracted.name || inquiry.patient_name}`,
                  description: `Patient: ${extracted.name || inquiry.patient_name}\nEmail: ${extracted.email || inquiry.patient_email}`,
                  start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'America/Chicago',
                  },
                  end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'America/Chicago',
                  },
                }
              );
              
              // Update appointment with Google event ID
          await supabase
                .from('appointments')
                .update({ google_calendar_event_id: googleEventId })
                .eq('id', newAppointment.id);
            } catch (calendarErr) {
              console.error('❌ Calendar event creation failed:', calendarErr);
              // Continue even if calendar event fails
            }
          }
          
          // Get therapist name for confirmation
          const therapistName = therapist.name || 'the therapist';
          const dateStr = parsedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const timeStr = parsedTime;
          
          const confirmationMessage = `Perfect! I've booked your appointment with **${therapistName}** for ${dateStr} at ${timeStr}. You'll receive a confirmation email shortly.`;
          
          const newHistory = [
            ...(conversationHistory || []),
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: confirmationMessage, timestamp: new Date().toISOString() },
          ];

          await supabase.from('inquiries').update({
            conversation_history: newHistory,
            status: 'scheduled',
          }).eq('id', currentInquiryId);

          return new Response(JSON.stringify({
            reply: confirmationMessage,
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
            appointmentId: newAppointment.id,
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (bookingErr) {
          console.error('❌ Booking error:', bookingErr);
        }
      } else {
        // Not available - suggest alternatives
        const dateStr = parsedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const unavailableMessage = `I'm sorry, but ${availability.reason || 'that time slot is not available'}. Would you like to try a different date or time?`;
        
        const newHistory = [
          ...(conversationHistory || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: unavailableMessage, timestamp: new Date().toISOString() },
        ];

        await supabase.from('inquiries').update({
          conversation_history: newHistory,
        }).eq('id', currentInquiryId);

        return new Response(JSON.stringify({
          reply: unavailableMessage,
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
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // If user mentioned date/time, check availability and confirm
    if (parsedDate && parsedTime && selectedTherapistId) {
      const therapistId: string = selectedTherapistId;
      const availability = await checkTherapistAvailability(supabase, therapistId, parsedDate, parsedTime);
      
      const dateStr = parsedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = parsedTime;
      
      if (availability.available) {
        const confirmationMessage = `Great! I've checked availability. ${inquiry.matched_therapist_id ? 'The therapist' : 'Your selected therapist'} is available on ${dateStr} at ${timeStr}. Would you like me to book this appointment for you?`;
        
        const aiResponse = await generateAIResponse(message, conversationHistory, {
          extractedInfo: extracted,
          isLoggedIn: !!patientIdentifier,
        });

        const newHistory = [
          ...(conversationHistory || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: confirmationMessage, timestamp: new Date().toISOString() },
        ];

        await supabase.from('inquiries').update({
          conversation_history: newHistory,
        }).eq('id', currentInquiryId);

        return new Response(JSON.stringify({
          reply: confirmationMessage,
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
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } else {
        const unavailableMessage = `I'm sorry, but ${availability.reason || 'that time slot is not available'}. Would you like to try a different date or time?`;
        
        const newHistory = [
          ...(conversationHistory || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: unavailableMessage, timestamp: new Date().toISOString() },
        ];

        await supabase.from('inquiries').update({
          conversation_history: newHistory,
        }).eq('id', currentInquiryId);

        return new Response(JSON.stringify({
          reply: unavailableMessage,
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
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Determine missing fields
    const requiresEmail = !patientIdentifier;
    const requiredFields = ['name', 'preferred_time', 'day_type', 'insurance'] as const;
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!extracted[field] || extracted[field].toString().trim() === '') {
        missingFields.push(field);
      }
    }
    if (requiresEmail && (!extracted.email || extracted.email.trim() === '')) {
      missingFields.push('email');
    }

    // If missing fields, ask for them naturally
    if (missingFields.length > 0) {
      // Check if we should find therapists based on what we have
      let matchedTherapists: any[] = [];
      if (extracted.insurance || extracted.problem) {
        matchedTherapists = await findMatchingTherapists(supabase, {
          insurance: extracted.insurance,
          problem: extracted.problem,
        }, 4);
      }

      const aiResponse = await generateAIResponse(message, conversationHistory, {
        extractedInfo: extracted,
        missingFields,
        matchedTherapists: matchedTherapists.length > 0 ? matchedTherapists : undefined,
        isLoggedIn: !!patientIdentifier,
      });

      const newHistory = [
        ...(conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() },
      ];

      const inquiryData: any = {
        problem_description: inquiry?.problem_description || message,
        requested_schedule: extracted.preferred_time || null,
        insurance_info: extracted.insurance || null,
        extracted_specialty: extracted.problem || null,
        conversation_history: newHistory,
        status: 'pending',
        patient_name: extracted.name || null,
        patient_email: extracted.email || null,
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
        console.error('❌ DB error:', dbErr);
      }

      return new Response(JSON.stringify({
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
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: All information collected - find therapists and confirm booking
    // ─────────────────────────────────────────────────────────────────────────────

    // Find matching therapists
    const matchedTherapists = await findMatchingTherapists(supabase, {
      insurance: extracted.insurance,
      problem: extracted.problem,
    }, 4);

    if (matchedTherapists.length > 0) {
      const aiResponse = await generateAIResponse(message, conversationHistory, {
        extractedInfo: extracted,
        matchedTherapists,
        isLoggedIn: !!patientIdentifier,
      });

      const newHistory = [
        ...(conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() },
      ];

      const inquiryData: any = {
        problem_description: inquiry?.problem_description || message,
        requested_schedule: extracted.preferred_time || null,
        insurance_info: extracted.insurance || null,
        extracted_specialty: extracted.problem || null,
        conversation_history: newHistory,
        status: 'matched',
        patient_name: extracted.name || null,
        patient_email: extracted.email || null,
        matched_therapist_id: matchedTherapists[0].id,
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
        console.error('❌ DB error:', dbErr);
      }

      return new Response(JSON.stringify({
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
        needsMoreInfo: false,
        matchedTherapists: matchedTherapists.map((t: any) => ({
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
        })),
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // No therapists found
    const noMatchMessage = `I'm sorry, I couldn't find any therapists matching your criteria. Could you try with different insurance or specialty?`;

    return new Response(JSON.stringify({
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
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('❌ Error in handle-chat:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'An error occurred',
      reply: 'I apologize, but I encountered a technical issue. Please try again in a moment.'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
