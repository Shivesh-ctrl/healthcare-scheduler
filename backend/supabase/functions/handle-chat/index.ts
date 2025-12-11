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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Call AI API to extract information from user message
 */
async function extractInfoWithAI(userMessage: string, conversationHistory: any[] = []): Promise<{ problem: string; schedule: string; insurance: string }> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  // Build conversation context
  let conversationContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    conversationContext = '\n\nPrevious conversation:\n';
    conversationHistory.forEach((msg: any) => {
      if (msg.role === 'user') {
        conversationContext += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationContext += `Assistant: ${msg.content}\n`;
      }
    });
  }

  // Construct prompt
  const prompt = `You are a helpful healthcare scheduling assistant. The user is looking for a therapist.

User message: ${userMessage}${conversationContext}

Extract the main problem/symptoms, preferred schedule times (if any), and insurance provider (if any).

Format the output as JSON: { "problem": "...", "schedule": "...", "insurance": "..." }

If any field is not mentioned, use an empty string "".

Return ONLY the JSON object, nothing else.`;

  try {
    // Try Google Gemini first (default)
    if (Deno.env.get('GOOGLE_AI_API_KEY')) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Google AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in AI response');
    }

    // Fallback to OpenAI if Google key not available
    if (Deno.env.get('OPENAI_API_KEY')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful healthcare scheduling assistant. Extract information and return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || '';
      
      // Extract JSON from response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in AI response');
    }

    throw new Error('No AI API key configured');
  } catch (error: any) {
    console.error('❌ AI extraction error:', error);
    throw new Error(`AI extraction failed: ${error.message}`);
  }
}

/**
 * Generate AI response for user message
 */
async function generateAIResponse(userMessage: string, conversationHistory: any[] = [], extractedInfo: any = null): Promise<string> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  // Build conversation context
  let conversationContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg: any) => {
      if (msg.role === 'user') {
        conversationContext += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationContext += `Assistant: ${msg.content}\n`;
      }
    });
  }

  // Build prompt
  let prompt = `You are a warm, empathetic healthcare scheduling assistant helping people find therapists.

User message: ${userMessage}`;

  if (conversationContext) {
    prompt += `\n\nPrevious conversation:\n${conversationContext}`;
  }

  if (extractedInfo) {
    prompt += `\n\nExtracted information:\n- Problem: ${extractedInfo.problem || 'Not mentioned'}\n- Schedule: ${extractedInfo.schedule || 'Not mentioned'}\n- Insurance: ${extractedInfo.insurance || 'Not mentioned'}`;
  }

  prompt += `\n\nRespond warmly and helpfully. If you need more information (problem, schedule, or insurance), ask for it naturally.`;

  try {
    // Try Google Gemini first
    if (Deno.env.get('GOOGLE_AI_API_KEY')) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Google AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I encountered an issue generating a response.';
    }

    // Fallback to OpenAI
    if (Deno.env.get('OPENAI_API_KEY')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a warm, empathetic healthcare scheduling assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'I apologize, but I encountered an issue generating a response.';
    }

    throw new Error('No AI API key configured');
  } catch (error: any) {
    console.error('❌ AI response generation error:', error);
    throw new Error(`AI response generation failed: ${error.message}`);
  }
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
    const { message, inquiryId, conversationHistory = [], patientIdentifier }: ChatRequest = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Load existing inquiry if inquiryId provided
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

    // Extract information using AI
    console.log('🤖 Extracting information from user message...');
    let extractedInfo: { problem: string; schedule: string; insurance: string };
    
    try {
      extractedInfo = await extractInfoWithAI(message, conversationHistory);
      console.log('✅ Extracted info:', extractedInfo);
    } catch (error: any) {
      console.error('❌ Extraction error:', error);
      // Continue with empty extraction if AI fails
      extractedInfo = { problem: '', schedule: '', insurance: '' };
    }

    // Generate AI response
    console.log('🤖 Generating AI response...');
    let aiResponse: string;
    
    try {
      aiResponse = await generateAIResponse(message, conversationHistory, extractedInfo);
      console.log('✅ AI response generated');
    } catch (error: any) {
      console.error('❌ AI response error:', error);
      aiResponse = 'I apologize, but I encountered a technical issue. Please try again.';
    }

    // Update conversation history
    const newHistory: any[] = [
      ...(conversationHistory || []),
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
    ];

    // Save or update inquiry
    const inquiryData: any = {
      problem_description: inquiry?.problem_description || message,
      requested_schedule: extractedInfo.schedule || inquiry?.requested_schedule || null,
      insurance_info: extractedInfo.insurance || inquiry?.insurance_info || null,
      extracted_specialty: extractedInfo.problem || inquiry?.extracted_specialty || null,
      conversation_history: newHistory,
      status: 'pending',
    };

    if (patientIdentifier) {
      inquiryData.patient_identifier = patientIdentifier;
    }

    if (!currentInquiryId) {
      // Create new inquiry
      const { data: newInquiry, error } = await supabase
        .from('inquiries')
        .insert(inquiryData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating inquiry:', error);
        throw error;
      }

      currentInquiryId = newInquiry.id;
      inquiry = newInquiry;
      console.log('✅ Created new inquiry:', currentInquiryId);
    } else {
      // Update existing inquiry
      const { data: updatedInquiry, error } = await supabase
        .from('inquiries')
        .update(inquiryData)
        .eq('id', currentInquiryId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating inquiry:', error);
        throw error;
      }

      inquiry = updatedInquiry;
      console.log('✅ Updated inquiry:', currentInquiryId);
    }

    // Determine if we have enough info to trigger matching
    const hasProblem = extractedInfo.problem && extractedInfo.problem.trim() !== '';
    const hasInsurance = extractedInfo.insurance && extractedInfo.insurance.trim() !== '';
    const needsMoreInfo = !hasProblem || !hasInsurance;

    // If we have enough info, optionally trigger find-therapist
    let matchedTherapists: any[] | undefined = undefined;
    if (!needsMoreInfo) {
      console.log('✅ Enough info collected, can trigger matching');
      // Note: Actual matching can be done by calling find-therapist function
      // or handled separately by the frontend
    }

    // Build response
    const response: ChatResponse = {
      reply: aiResponse,
      inquiryId: currentInquiryId || '',
      extractedInfo: {
        problem: extractedInfo.problem,
        specialty: extractedInfo.problem, // Using problem as specialty for now
        schedule: extractedInfo.schedule,
        insurance: extractedInfo.insurance,
      },
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
    
    let errorMessage = 'An error occurred';
    if (error?.message) {
      errorMessage = String(error.message);
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
