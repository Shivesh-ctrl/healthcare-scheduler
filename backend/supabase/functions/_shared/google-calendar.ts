import { GoogleCalendarEvent } from './types.ts';

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class GoogleCalendarService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }
  }

  async getAccessToken(refreshToken: string): Promise<string> {
    console.log('      🔑 Requesting access token from Google OAuth endpoint...');
    console.log('      - Using refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const data: TokenResponse = await response.json();
    console.log('      ✅ Access token obtained successfully');
    return data.access_token;
  }

  async createEvent(
    calendarId: string,
    refreshToken: string,
    event: GoogleCalendarEvent
  ): Promise<string> {
    // Step 3: Get Access Token using refresh_token, CLIENT_ID, CLIENT_SECRET
    const accessToken = await this.getAccessToken(refreshToken);

    // Step 4: Create Calendar Event using access token
    console.log(`      📅 Creating event on calendar: ${calendarId}`);
    console.log(`      - Using Google Calendar API events.insert endpoint`);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create calendar event: ${error}`);
    }

    const data = await response.json();
    console.log(`      ✅ Event created successfully with ID: ${data.id}`);
    return data.id;
  }

  async deleteEvent(
    calendarId: string,
    refreshToken: string,
    eventId: string
  ): Promise<void> {
    const accessToken = await this.getAccessToken(refreshToken);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete calendar event: ${error}`);
    }
  }

  async checkAvailability(
    calendarId: string,
    refreshToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const accessToken = await this.getAccessToken(refreshToken);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/freeBusy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: calendarId }],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to check availability: ${error}`);
    }

    const data = await response.json();
    const busySlots = data.calendars[calendarId]?.busy || [];
    
    return busySlots.length === 0;
  }
}

