// @ts-ignore - Deno HTTP imports are valid in Supabase Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { GoogleCalendarService } from '../_shared/google-calendar.ts';

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface BookAppointmentRequest {
  inquiryId?: string | null;
  therapistId: string;
  startTime: string;
  patientInfo: {
    patient_name: string;
    patient_email: string;
    patient_phone?: string;
    notes?: string;
  };
}

serve(async (req: Request) => {
  // Log immediately when function is called
  console.log('🚀 book-appointment function called');
  console.log('📋 Request method:', req.method);
  console.log('📋 Request URL:', req.url);
  console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));
  
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log('⚠️ CORS preflight request - returning CORS headers');
    return corsResponse;
  }

  try {
    // ============================================
    // STEP 1: RECEIVE DATA
    // ============================================
    console.log('📥 Step 1: Receiving booking request...');
    console.log('📥 Reading request body...');
    
    const requestBody = await req.json();
    console.log('📥 Request body received:', JSON.stringify(requestBody, null, 2));
    
    const {
      inquiryId,
      therapistId,
      startTime,
      patientInfo
    }: BookAppointmentRequest = requestBody;

    if (!therapistId || !startTime || !patientInfo?.patient_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Step 1 Complete: Received inquiryId, therapistId, startTime, patientInfo');

    const supabase = createSupabaseClient();

    // Get authenticated user's email from auth token if patient_email is missing
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

    // Use authenticated email if patient_email is not provided
    const finalPatientEmail = patientInfo.patient_email || authenticatedUserEmail;
    if (!finalPatientEmail) {
      return new Response(
        JSON.stringify({ error: 'Patient email is required. Please provide email or ensure you are signed in.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate end time (1 hour after start time)
    const start = new Date(startTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const endTime = end.toISOString();

    const patientName = patientInfo.patient_name;
    const patientEmail = finalPatientEmail;
    const patientPhone = patientInfo.patient_phone;
    const notes = patientInfo.notes;
    
    if (authenticatedUserEmail && !patientInfo.patient_email) {
      console.log('✅ Using authenticated user email for appointment:', authenticatedUserEmail);
    }

    // ============================================
    // STEP 2: FETCH CREDENTIALS
    // ============================================
    console.log('🔐 Step 2: Fetching therapist credentials (google_refresh_token)...');
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', therapistId)
      .single();

    if (therapistError) throw therapistError;

    if (!therapist) {
      return new Response(
        JSON.stringify({ error: 'Therapist not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Step 2 Complete: Fetched therapist credentials');
    console.log(`   - Therapist: ${therapist.name}`);
    console.log(`   - Has calendar_id: ${!!therapist.google_calendar_id}`);
    console.log(`   - Has refresh_token: ${!!therapist.google_refresh_token}`);

    let googleEventId = null;

    // ============================================
    // STEP 3 & 4: GET ACCESS TOKEN & CREATE CALENDAR EVENT
    // ============================================
    if (therapist.google_calendar_id && therapist.google_refresh_token) {
      try {
        console.log('📅 Step 3 & 4: Creating Google Calendar event...');
        const calendarService = new GoogleCalendarService();

        // Check availability first
        console.log('   - Checking availability...');
        const isAvailable = await calendarService.checkAvailability(
          therapist.google_calendar_id,
          therapist.google_refresh_token,
          new Date(startTime),
          new Date(endTime)
        );

        if (!isAvailable) {
          return new Response(
            JSON.stringify({ error: 'Time slot is no longer available' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('   - Slot is available');

        // Create the event
        const event = {
          summary: `Therapy Session - ${patientName}`,
          description: `Patient: ${patientName}\nEmail: ${patientEmail}\nPhone: ${patientPhone || 'N/A'}\n${notes ? `\nNotes: ${notes}` : ''}`,
          start: {
            dateTime: startTime,
            timeZone: 'America/Chicago',
          },
          end: {
            dateTime: endTime,
            timeZone: 'America/Chicago',
          },
          attendees: [
            { email: patientEmail },
            { email: therapist.email }
          ],
        };

        console.log('   - Step 3: Getting access token from Google OAuth...');
        console.log('   - Step 4: Creating event on calendar...');
        googleEventId = await calendarService.createEvent(
          therapist.google_calendar_id,
          therapist.google_refresh_token,
          event
        );
        console.log(`✅ Step 3 & 4 Complete: Calendar event created with ID: ${googleEventId}`);
      } catch (calendarError) {
        console.error('❌ Google Calendar error:', calendarError);
        // Continue without calendar event - don't fail the whole booking
      }
    } else {
      console.log('⚠️  Calendar not configured for therapist - skipping Steps 3 & 4');
    }

    // ============================================
    // STEP 5: DATABASE UPDATE
    // ============================================
    console.log('💾 Step 5: Updating database...');
    
    // 5a. Save Appointment with google_calendar_event_id
    console.log('   - Creating appointment record...');
    console.log('   - Appointment data:', JSON.stringify({
      inquiry_id: inquiryId,
      therapist_id: therapistId,
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      start_time: startTime,
      end_time: endTime,
      google_calendar_event_id: googleEventId,
      notes: notes,
      status: 'confirmed'
    }, null, 2));
    
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        inquiry_id: inquiryId,
        therapist_id: therapistId,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        start_time: startTime,
        end_time: endTime,
        google_calendar_event_id: googleEventId,
        notes: notes,
        status: 'confirmed'
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('❌ Appointment insertion error:', appointmentError);
      throw appointmentError;
    }
    
    if (!appointment) {
      throw new Error('Appointment was not created - no data returned');
    }
    
    console.log(`✅ Appointment created with ID: ${appointment.id}`);
    console.log(`   - Full appointment data:`, JSON.stringify(appointment, null, 2));
    console.log(`   - Calendar event ID stored: ${googleEventId || 'N/A'}`);
    
    // Verify appointment was saved by retrieving it
    console.log('   - Verifying appointment was saved to database...');
    const { data: verifyAppointment, error: verifyError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment.id)
      .single();
    
    if (verifyError || !verifyAppointment) {
      console.error('⚠️  Warning: Could not verify appointment in database:', verifyError);
    } else {
      console.log('✅ Verification successful: Appointment confirmed in database');
      console.log(`   - Verified appointment ID: ${verifyAppointment.id}`);
      console.log(`   - Verified patient: ${verifyAppointment.patient_name}`);
      console.log(`   - Verified start time: ${verifyAppointment.start_time}`);
    }

    // 5b. Update Inquiry Status AND Patient Info
    if (inquiryId) {
      console.log('   - Updating inquiry status and patient info...');
      const inquiryUpdateData: any = {
        status: 'scheduled',
        matched_therapist_id: therapistId,
        patient_name: patientName,
        patient_email: patientEmail,
      };
      
      if (patientPhone) {
        inquiryUpdateData.patient_phone = patientPhone;
      }
      
      const { error: updateError } = await supabase
      .from('inquiries')
      .update(inquiryUpdateData)
      .eq('id', inquiryId);
      
      if (updateError) {
        console.error('   - Warning: Failed to update inquiry:', updateError);
      } else {
        console.log('   - Inquiry updated successfully with patient info and status');
      }
    }

    console.log('✅ Step 5 Complete: Database updated');
    console.log('🎉 All 5 steps completed successfully!');
    console.log('📊 Final Summary:');
    console.log(`   - Appointment ID: ${appointment.id}`);
    console.log(`   - Therapist ID: ${therapistId}`);
    console.log(`   - Patient: ${patientName} (${patientEmail})`);
    console.log(`   - Start Time: ${startTime}`);
    console.log(`   - Calendar Event ID: ${googleEventId || 'N/A (Calendar not connected)'}`);
    console.log(`   - Database Status: ✅ Saved`);
    console.log(`   - Calendar Status: ${googleEventId ? '✅ Synced' : '⚠️  Not synced (calendar not connected)'}`);

    return new Response(
      JSON.stringify({
        success: true,
        appointment,
        calendarEventId: googleEventId,
        therapistId: therapistId,
        therapistName: therapist.name,
        therapistEmail: therapist.email,
        message: googleEventId 
          ? 'Appointment booked and synced to Google Calendar' 
          : 'Appointment booked (calendar not connected)',
        details: {
          appointmentId: appointment.id,
          calendarSynced: !!googleEventId,
          calendarEventId: googleEventId,
          savedToDatabase: true
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in book-appointment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

