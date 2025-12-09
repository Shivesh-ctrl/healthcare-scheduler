import { streamText, generateText } from 'https://esm.sh/ai@3.4.0';
import { openai } from 'https://esm.sh/@ai-sdk/openai@1.0.0';
import { anthropic } from 'https://esm.sh/@ai-sdk/anthropic@1.0.0';
import { createGoogleGenerativeAI } from 'https://esm.sh/@ai-sdk/google@1.0.2';

export type AIProvider = 'openai' | 'anthropic' | 'google';

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
  
  // Use Google Gemini models only
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
        temperature: 0.3, // Lower for faster, more deterministic responses
        maxOutputTokens: 600, // Reduced for faster generation
        topP: 0.7, // Lower for faster generation
        topK: 10, // Limit choices for faster generation
      }
    };
    
    // Use best models for paid tier - more reliable and faster
    const models = [
      'gemini-1.5-flash',      // Try first (fastest, most reliable)
      'gemini-2.0-flash-exp',  // Fallback (newer, more stable)
    ];
    
    let lastError = null;
    
    // Try v1 API only (faster, more stable) - skip v1beta to save time
    const apiVersions = ['v1'];
    
    // Maximum total timeout: 45 seconds (increased for paid tier reliability)
    const maxTotalTimeout = 45000;
    const startTime = Date.now();
    
    for (const apiVersion of apiVersions) {
      for (const modelName of models) {
        // Check if we've exceeded maximum total timeout
        if (Date.now() - startTime > maxTotalTimeout) {
          console.log(`⏱️  Maximum total timeout (${maxTotalTimeout}ms) exceeded, stopping...`);
          throw new Error('Request timeout. All Gemini models are currently at capacity. Please wait a moment and try again.');
        }
        
        // Create new timeout for each model attempt - increased for paid tier
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`⏱️  Timeout (20s) for ${modelName}, aborting...`);
          controller.abort();
        }, 20000); // 20 second timeout - paid tier can handle longer requests
        
        try {
          console.log(`🔄 Trying model: ${modelName} (API: ${apiVersion})`);
          // Use fetch with timeout for faster response
          const fetchPromise = fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            }
          );
          
          const response = await fetchPromise;
          
          // FAST FAILURE: Check status immediately, don't wait for timeout
          clearTimeout(timeoutId); // Clear timeout as soon as we get response
          
          if (!response.ok) {
            // Read error text quickly
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: { message: errorText } };
            }
            
            // Check for quota errors or model not found - FAIL FAST
            const isQuotaError = errorData.error?.message?.includes('quota') || 
                                errorData.error?.message?.includes('Quota') ||
                                errorData.error?.message?.includes('capacity') ||
                                errorData.error?.message?.includes('Capacity') ||
                                errorData.error?.message?.includes('RESOURCE_EXHAUSTED') ||
                                errorText.includes('quota') ||
                                errorText.includes('Quota') ||
                                errorText.includes('capacity') ||
                                errorText.includes('Capacity') ||
                                errorText.includes('RESOURCE_EXHAUSTED') ||
                                response.status === 429 || // Rate limit status
                                response.status === 503; // Service unavailable
            
            const isModelNotFound = errorData.error?.message?.includes('not found') ||
                                   errorData.error?.message?.includes('does not exist') ||
                                   errorData.error?.message?.includes('not available') ||
                                   errorText.includes('not found');
            
            // If quota exceeded, fail immediately - don't try other models
            if (isQuotaError) {
              console.log(`❌ Quota exceeded for ${modelName} - failing fast`);
              throw new Error('All Gemini models are currently at capacity. Please wait a moment and try again.');
            }
            
            // If model not found, try next model
            if (isModelNotFound) {
              console.log(`⚠️  Model not found for ${modelName} (${apiVersion}), trying next...`);
              lastError = new Error(`Model not found for ${modelName}`);
              continue;
            }
            
            // If it's a 400 error but not quota/model not found, might be API version issue - try next version
            if (response.status === 400 && apiVersion === 'v1beta') {
              console.log(`⚠️  API version issue for ${modelName}, will try v1 next`);
              continue;
            }
            
            // Other errors, throw immediately
            throw new Error(`Google AI API error (${modelName}, ${apiVersion}): ${errorText}`);
          }
          
          clearTimeout(timeoutId); // Clear timeout on success
          
          // Response is OK, parse it
          const data = await response.json();
          console.log(`✅ Success with model: ${modelName} (API: ${apiVersion})`);
          
          // Validate response structure before accessing nested properties
          if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
            console.error('❌ Invalid response: no candidates array');
            throw new Error(`Invalid response from ${modelName}: no candidates found`);
          }
          
          const candidate = data.candidates[0];
          if (!candidate || !candidate.content || !candidate.content.parts) {
            console.error('❌ Invalid response: missing content or parts');
            throw new Error(`Invalid response from ${modelName}: missing content/parts`);
          }
          
          if (!Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
            console.error('❌ Invalid response: empty parts array');
            throw new Error(`Invalid response from ${modelName}: empty parts array`);
          }
          
          const text = candidate.content.parts[0].text;
          if (!text || typeof text !== 'string') {
            console.error('❌ Invalid response: no text in parts[0]');
            throw new Error(`Invalid response from ${modelName}: no text found`);
          }
          
          return text;
        } catch (error) {
          clearTimeout(timeoutId);
          
          // If timeout, try next model (don't fail immediately)
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            console.log(`⏱️  Timeout for ${modelName}, trying next model...`);
            lastError = new Error(`Request timeout for ${modelName}`);
            continue; // Try next model instead of failing immediately
          }
          
          // If it's a quota error, throw immediately - don't try other models
          if (error.message?.includes('quota') || 
              error.message?.includes('Quota') || 
              error.message?.includes('capacity') ||
              error.message?.includes('Capacity')) {
            throw error; // Re-throw quota errors immediately
          }
          
          // If it's a model not found, continue to next model
          if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
            lastError = error;
            continue;
          }
          
          // Other errors, throw immediately
          throw error;
        }
      }
    }
    
    // All Gemini models failed - provide helpful error message
    console.log('❌ All Gemini models failed');
    console.error('Last error:', lastError);
    
    // Provide more specific error message based on last error
    if (lastError?.message?.includes('timeout') || lastError?.message?.includes('Request timeout')) {
      throw new Error('Request timeout. The AI service is taking longer than expected. Please try again in a moment.');
    } else if (lastError?.message?.includes('quota') || lastError?.message?.includes('capacity')) {
      throw new Error('All Gemini models are currently at capacity. Please wait a moment and try again.');
    } else {
      throw new Error('The AI service encountered an issue. Please try again in a moment.');
    }
  }
  
  // ONLY SUPPORT GEMINI - No other providers
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

