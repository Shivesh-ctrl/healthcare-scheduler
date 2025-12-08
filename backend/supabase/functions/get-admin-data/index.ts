import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get inquiries with therapist details
    const { data: inquiries, error: inquiriesError } = await supabase
      .from('inquiries')
      .select(`
        *,
        therapists:matched_therapist_id (
          id,
          name,
          email,
          specialties
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (inquiriesError) throw inquiriesError;

    // Get appointments with therapist details
    console.log('📅 Fetching appointments from database...');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        *,
        therapists:therapist_id (
          id,
          name,
          email,
          specialties
        ),
        inquiries:inquiry_id (
          id,
          problem_description,
          status
        )
      `)
      .order('start_time', { ascending: true })
      .limit(100);
    
    console.log('📅 Raw appointments query result:', {
      count: appointments?.length || 0,
      error: appointmentsError?.message || null,
      sample: appointments?.[0] || null
    });

    if (appointmentsError) {
      console.error('❌ Error fetching appointments:', appointmentsError);
      throw appointmentsError;
    }
    
    console.log(`✅ Found ${appointments?.length || 0} appointments in database`);
    if (appointments && appointments.length > 0) {
      console.log('📋 Sample appointment:', appointments[0]);
    }

    // Get therapists list
    const { data: therapists, error: therapistsError } = await supabase
      .from('therapists')
      .select('*')
      .order('name');

    if (therapistsError) throw therapistsError;

    // Get statistics
    const stats = {
      totalInquiries: inquiries?.length || 0,
      pendingInquiries: inquiries?.filter(i => i.status === 'pending').length || 0,
      matchedInquiries: inquiries?.filter(i => i.status === 'matched').length || 0,
      scheduledInquiries: inquiries?.filter(i => i.status === 'scheduled').length || 0,
      totalAppointments: appointments?.length || 0,
      confirmedAppointments: appointments?.filter(a => a.status === 'confirmed').length || 0,
      activeTherapists: therapists?.filter(t => t.is_active).length || 0,
    };

    return new Response(
      JSON.stringify({
        inquiries,
        appointments,
        therapists,
        stats
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-admin-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

