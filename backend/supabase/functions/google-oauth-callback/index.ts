import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS for preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // OAuth callbacks from Google don't include authorization headers
  // This is expected and safe since we validate the code with Google
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains therapist_id
    const error = url.searchParams.get('error');

    if (error) {
      // Redirect to admin dashboard with error
      const frontendUrl = Deno.env.get('VITE_FRONTEND_URL') || 'http://localhost:5173';
      return Response.redirect(`${frontendUrl}/admin?oauth_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      const frontendUrl = Deno.env.get('VITE_FRONTEND_URL') || 'http://localhost:5173';
      return Response.redirect(
        `${frontendUrl}/admin?oauth_error=${encodeURIComponent('Missing authorization code or state parameter')}`,
        302
      );
    }

    const therapistId = state;
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    // Use frontend callback URL (must match EXACTLY what's in get-oauth-url and Google Console)
    const frontendUrl = Deno.env.get('VITE_FRONTEND_URL') || 'http://localhost:5173';
    // Ensure no trailing slash and exact match
    const redirectUri = `${frontendUrl.replace(/\/$/, '')}/oauth/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    console.log('Exchanging token with redirect_uri:', redirectUri);
    console.log('Therapist ID:', therapistId);

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      console.error('Used redirect_uri:', redirectUri);
      
      // Provide more helpful error message
      let errorMessage = `Token exchange failed: ${errorText}`;
      if (errorText.includes('invalid_grant')) {
        errorMessage = 'Authorization code invalid or already used. Please try connecting the calendar again.';
      }
      throw new Error(errorMessage);
    }

    const tokenData = await tokenResponse.json();
    const { refresh_token, access_token } = tokenData;

    if (!refresh_token) {
      throw new Error('No refresh token received. Make sure to request offline access.');
    }

    // Get user's calendar ID using access token
    let calendarId = null;
    try {
      const calendarListResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );

      if (calendarListResponse.ok) {
        const calendarList = await calendarListResponse.json();
        // Use primary calendar
        const primaryCalendar = calendarList.items?.find((cal: any) => cal.primary) || calendarList.items?.[0];
        calendarId = primaryCalendar?.id || null;
      }
    } catch (e) {
      console.error('Error fetching calendar ID:', e);
      // Continue without calendar ID - can be set manually later
    }

    // Store refresh token and calendar ID in database
    const supabase = createSupabaseClient();
    const { error: updateError } = await supabase
      .from('therapists')
      .update({
        google_refresh_token: refresh_token,
        google_calendar_id: calendarId,
      })
      .eq('id', therapistId);

    if (updateError) {
      throw new Error(`Failed to update therapist: ${updateError.message}`);
    }

    // Return JSON response (frontend will handle redirect)
    return new Response(
      JSON.stringify({
        success: true,
        therapist_id: therapistId,
        calendar_id: calendarId,
        message: 'Calendar connected successfully'
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    // Return JSON error response (frontend will handle redirect)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'OAuth flow failed'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

