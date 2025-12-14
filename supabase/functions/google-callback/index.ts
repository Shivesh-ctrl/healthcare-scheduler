import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state') || ''
  const error = url.searchParams.get('error')
  
  // Parse state: format is "therapistId|origin" or just "therapistId" for backward compatibility
  let therapistId = stateParam
  let redirectHost = Deno.env.get('SITE_URL') || 'https://ai-scheduler-oqbk.vercel.app'
  
  if (stateParam && stateParam.includes('|')) {
    const parts = stateParam.split('|')
    therapistId = parts[0]
    if (parts[1]) {
      redirectHost = parts[1]
    }
  }

  if (error || !code || !therapistId) {
    return new Response(`Error: ${error || 'Missing code/state'}`, { status: 400 })
  }

  try {
    console.log(`🔐 Google OAuth Callback - Therapist ID: ${therapistId}`);
    
    // 1. Exchange Code for Tokens
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    console.log(`Client ID present: ${!!clientId}`);
    console.log(`Client Secret present: ${!!clientSecret}`);
    console.log(`Supabase URL: ${supabaseUrl}`);
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable not set')
    }
    
    const redirectUri = `${supabaseUrl}/functions/v1/google-callback`

    console.log('Exchanging auth code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      throw new Error(`Google token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }
    
    const tokens = await tokenResponse.json()
    console.log(`Token response status: ${tokenResponse.status}`);
    console.log(`Refresh token received: ${!!tokens.refresh_token}`);
    
    if (!tokens.refresh_token) {
      // Note: If you don't get a refresh token, it's usually because 
      // access_type=offline wasn't sent or the user was already authorized.
      // prompt=consent fixes this.
      console.error('No refresh token in response:', JSON.stringify(tokens));
      throw new Error("No refresh token returned from Google. Make sure access_type=offline and prompt=consent are set in the OAuth request.")
    }

    // 2. Save Refresh Token to Supabase
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use SERVICE ROLE to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Updating therapist ${therapistId} with refresh token...`);
    const { data, error: dbError } = await supabase
      .from('therapists')
      .update({ 
        google_refresh_token: tokens.refresh_token,
        google_calendar_id: 'primary' // Default to their main calendar
      })
      .eq('id', therapistId)
      .select()

    if (dbError) {
      console.error('Database update error:', dbError);
      throw dbError;
    }
    
    console.log(`✅ Refresh token saved successfully for therapist ${therapistId}`);
    console.log(`Updated rows:`, data);

    // 3. Redirect back to your React Admin App
    return Response.redirect(`${redirectHost}/admin?success=true&state=${therapistId}`, 302)

  } catch (err) {
    console.error('OAuth callback error:', err);
    let errorMessage = 'An unknown error occurred';
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else {
      errorMessage = JSON.stringify(err);
    }
    
    // Return error with details for debugging
    return new Response(
      JSON.stringify({ 
        error: 'OAuth Failed', 
        message: errorMessage,
        details: err instanceof Error ? err.stack : undefined
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
})