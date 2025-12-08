import { streamText, generateText } from 'https://esm.sh/ai@3.4.0';
import { openai } from 'https://esm.sh/@ai-sdk/openai@1.0.0';
import { anthropic } from 'https://esm.sh/@ai-sdk/anthropic@1.0.0';
import { createGoogleGenerativeAI } from 'https://esm.sh/@ai-sdk/google@1.0.2';

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq';

export function getAIModel(provider: AIProvider = 'openai') {
  switch (provider) {
    case 'openai':
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiKey) throw new Error('OpenAI API key not configured');
      return openai('gpt-3.5-turbo', { apiKey: openaiKey });
    
    case 'anthropic':
      const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!anthropicKey) throw new Error('Anthropic API key not configured');
      return anthropic('claude-3-5-sonnet-20241022', { apiKey: anthropicKey });
    
    case 'google':
      const googleKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY');
      if (!googleKey) throw new Error('Google AI API key not configured');
      const google = createGoogleGenerativeAI({ apiKey: googleKey });
      return google('gemini-1.5-flash');
    
    case 'groq':
      const groqKey = Deno.env.get('GROQ_API_KEY');
      if (!groqKey) throw new Error('Groq API key not configured');
      // Groq uses OpenAI-compatible API
      return openai('llama-3.1-70b-versatile', { 
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1'
      });
    
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export async function generateAIResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  provider: AIProvider = 'google'
) {
  // Handle OpenAI provider
  if (provider === 'openai') {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OpenAI API key not configured');
    
    try {
      // Convert messages format for OpenAI
      const openaiMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return { role: 'system' as const, content: msg.content };
        } else if (msg.role === 'assistant') {
          return { role: 'assistant' as const, content: msg.content };
        } else {
          return { role: 'user' as const, content: msg.content };
        }
      });
      
      const result = await generateText({
        model: openai('gpt-3.5-turbo', { apiKey: openaiKey }),
        messages: openaiMessages,
        maxTokens: 512,
        temperature: 0.7,
      });
      return result.text;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }
  
  // Try Google first with fallback to Groq if all Google models fail
  if (provider === 'google') {
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY');
    if (!apiKey) throw new Error('Google AI API key not configured');
    
    // Convert messages to Gemini format
    const contents = [];
    let systemMessage = '';
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    // Prepend system message to first user message if present
    if (systemMessage && contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts[0].text = `${systemMessage}\n\nUser: ${contents[0].parts[0].text}`;
    }
    
    const requestBody = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512, // Further reduced for faster responses
      }
    };
    
    // ONLY USE FREE TIER GEMINI MODELS - Prioritize fastest, most available models
    // Expanded list with more free-tier models for better availability
    const models = [
      'gemini-1.5-flash',           // Most reliable and fast - PRIMARY
      'gemini-1.5-flash-latest',    // Latest flash variant
      'gemini-1.5-flash-001',       // Versioned flash variant
      'gemini-1.5-flash-002',       // Another versioned variant
      'gemini-2.5-flash',           // Gemini 2.5 Flash (new!)
      'gemini-2.5-flash-latest',    // Latest 2.5 Flash variant (new!)
      'gemini-2.5-pro',             // Gemini 2.5 Pro (new!)
      'gemini-2.5-pro-latest',      // Latest 2.5 Pro variant (new!)
      'gemini-1.5-pro',             // Pro version (free tier)
      'gemini-1.5-pro-latest',      // Latest pro variant
      'gemini-pro',                 // Legacy - stable fallback
      'gemini-2.0-flash-exp',       // Experimental 2.0 version
      'gemini-2.0-flash',           // Stable 2.0 flash
      'gemini-1.0-pro',             // Original model
      'gemini-pro-vision',          // Vision-capable model (free tier)
    ];
    
    let lastError = null;
    
    // Try v1 API only (faster, more stable) - skip v1beta to save time
    const apiVersions = ['v1'];
    
    for (const apiVersion of apiVersions) {
      for (const modelName of models) {
        // Create new timeout for each model attempt
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`⏱️  Timeout (8s) for ${modelName}, aborting...`);
          controller.abort();
        }, 8000); // 8 second timeout per model
        
        try {
          console.log(`🔄 Trying model: ${modelName} (API: ${apiVersion})`);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            }
          );
          
          clearTimeout(timeoutId); // Clear timeout on success
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Success with model: ${modelName} (API: ${apiVersion})`);
            return data.candidates[0].content.parts[0].text;
          }
          
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }
          
          // Check for quota errors or model not found
          const isQuotaError = errorData.error?.message?.includes('quota') || 
                              errorData.error?.message?.includes('Quota') ||
                              errorText.includes('quota') ||
                              errorText.includes('Quota');
          
          const isModelNotFound = errorData.error?.message?.includes('not found') ||
                                 errorData.error?.message?.includes('does not exist') ||
                                 errorData.error?.message?.includes('not available') ||
                                 errorText.includes('not found');
          
          // If quota exceeded or model not found, try next model
          if (isQuotaError || isModelNotFound) {
            console.log(`⚠️  ${isQuotaError ? 'Quota exceeded' : 'Model not found'} for ${modelName} (${apiVersion}), trying next...`);
            lastError = new Error(`${isQuotaError ? 'Quota exceeded' : 'Model not found'} for ${modelName}`);
            continue;
          }
          
          // If it's a 400 error but not quota/model not found, might be API version issue - try next version
          if (response.status === 400 && apiVersion === 'v1beta') {
            console.log(`⚠️  API version issue for ${modelName}, will try v1 next`);
            continue;
          }
          
          // Other errors, throw immediately
          throw new Error(`Google AI API error (${modelName}, ${apiVersion}): ${errorText}`);
        } catch (error) {
          clearTimeout(timeoutId);
          
          // If timeout, try next model quickly
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            console.log(`⏱️  Timeout for ${modelName}, trying next model...`);
            lastError = new Error(`Request timeout for ${modelName}`);
            continue;
          }
          
          // If it's a quota error, continue to next model
          if (error.message?.includes('quota') || error.message?.includes('Quota')) {
            lastError = error;
            continue;
          }
          // If it's a model not found, continue
          if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
            lastError = error;
            continue;
          }
          // Other errors, throw immediately
          throw error;
        }
      }
    }
    
    // All Gemini models failed - NO FALLBACK to other providers
    console.log('❌ All Gemini free tier models failed - no fallback providers configured');
    
    // All Gemini models failed
    console.error('❌ All Gemini free tier models failed');
    console.error('Last error:', lastError);
    
    throw new Error('All free Gemini models are currently at capacity. Please wait a moment and try again. This is a temporary limit on Google\'s free tier.');
  }
  
  // ONLY SUPPORT GOOGLE/GEMINI - No other providers
  throw new Error(`Only Google Gemini models are supported. Provider '${provider}' is not available.`);
}

export async function streamAIResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  provider: AIProvider = 'openai'
) {
  const model = getAIModel(provider);
  
  const result = await streamText({
    model,
    messages,
  });

  return result.toTextStreamResponse();
}

