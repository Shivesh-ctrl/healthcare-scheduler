import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const therapistId = url.searchParams.get('therapist_id');

    if (!therapistId) {
      return new Response(
        JSON.stringify({ error: 'therapist_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build OAuth URL - Redirect to frontend callback route which will call backend with auth
    // Must match EXACTLY what's used in google-oauth-callback
    const frontendUrl = Deno.env.get('VITE_FRONTEND_URL') || 'http://localhost:5173';
    // Ensure no trailing slash for exact match
    const redirectUri = `${frontendUrl.replace(/\/$/, '')}/oauth/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ].join(' ');

    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUrl.searchParams.set('client_id', clientId);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', scopes);
    oauthUrl.searchParams.set('access_type', 'offline'); // Required to get refresh token
    oauthUrl.searchParams.set('prompt', 'consent'); // Force consent screen to get refresh token
    oauthUrl.searchParams.set('state', therapistId); // Pass therapist_id through state

    return new Response(
      JSON.stringify({ oauth_url: oauthUrl.toString() }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

