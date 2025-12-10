// @ts-ignore - Deno HTTP imports are valid in Supabase Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

interface FindTherapistRequest {
  inquiryId?: string;
  specialty?: string;
  insurance?: string;
  limit?: number;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { inquiryId, specialty, insurance, limit = 5 }: FindTherapistRequest = await req.json();

    const supabase = createSupabaseClient();

    let searchSpecialty = specialty;
    let searchInsurance = insurance;

    // If inquiryId provided, get info from inquiry
    if (inquiryId) {
      const { data: inquiry, error: inquiryError } = await supabase
        .from('inquiries')
        .select('extracted_specialty, insurance_info')
        .eq('id', inquiryId)
        .single();

      if (inquiryError) throw inquiryError;

      searchSpecialty = inquiry.extracted_specialty || searchSpecialty;
      searchInsurance = inquiry.insurance_info || searchInsurance;
    }

    if (!searchSpecialty && !searchInsurance) {
      return new Response(
        JSON.stringify({ error: 'Specialty or insurance required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all active therapists and filter in JavaScript for more reliable matching
    const { data: allTherapists, error: fetchError } = await supabase
      .from('therapists')
      .select('*')
      .eq('is_active', true);

    if (fetchError) throw fetchError;

    const specialtyLower = searchSpecialty?.toLowerCase().trim();
    const insuranceLower = searchInsurance?.toLowerCase().trim();

    // Filter therapists based on criteria
    let filteredTherapists = (allTherapists || []).filter((therapist: any) => {
      const hasSpecialty = !searchSpecialty || (
        therapist.specialties && 
        Array.isArray(therapist.specialties) &&
        therapist.specialties.some((s: string) => 
          s.toLowerCase().includes(specialtyLower) || 
          specialtyLower.includes(s.toLowerCase())
        )
      );

      const hasInsurance = !searchInsurance || (
        therapist.accepted_insurance && 
        Array.isArray(therapist.accepted_insurance) &&
        therapist.accepted_insurance.some((ins: string) => 
          ins.toLowerCase().includes(insuranceLower) || 
          insuranceLower.includes(ins.toLowerCase())
        )
      );

      return hasSpecialty && hasInsurance;
    });

    // Calculate match scores for ranking
    const scoredTherapists = filteredTherapists.map((therapist: any) => {
      let score = 0;
      
      // Exact specialty match gets highest score
      if (searchSpecialty && therapist.specialties) {
        const exactMatch = therapist.specialties.some((s: string) => 
          s.toLowerCase() === specialtyLower
        );
        const partialMatch = therapist.specialties.some((s: string) => 
          s.toLowerCase().includes(specialtyLower) || 
          specialtyLower.includes(s.toLowerCase())
        );
        
        if (exactMatch) {
          score += 20;
        } else if (partialMatch) {
        score += 10;
      }
      }
      
      // Exact insurance match
      if (searchInsurance && therapist.accepted_insurance) {
        const exactMatch = therapist.accepted_insurance.some((ins: string) => 
          ins.toLowerCase() === insuranceLower
        );
        const partialMatch = therapist.accepted_insurance.some((ins: string) => 
          ins.toLowerCase().includes(insuranceLower) || 
          insuranceLower.includes(ins.toLowerCase())
        );
        
        if (exactMatch) {
          score += 10;
        } else if (partialMatch) {
        score += 5;
        }
      }

      // Bonus for having multiple matching specialties
      if (searchSpecialty && therapist.specialties) {
        const relatedMatches = therapist.specialties.filter((s: string) => 
          s.toLowerCase().includes(specialtyLower) || 
          specialtyLower.includes(s.toLowerCase())
        );
        score += relatedMatches.length;
      }

      return { ...therapist, match_score: score };
    }).sort((a, b) => b.match_score - a.match_score).slice(0, limit);

    // Update inquiry if provided and matches found
    if (inquiryId && scoredTherapists.length > 0) {
      const { error: updateError } = await supabase
        .from('inquiries')
        .update({
          matched_therapist_id: scoredTherapists[0].id,
          status: 'matched'
        })
        .eq('id', inquiryId);

      if (updateError) {
        console.error('Error updating inquiry:', updateError);
      } else {
        console.log(`Updated inquiry ${inquiryId} with matched therapist ${scoredTherapists[0].id}`);
      }
    }

    return new Response(
      JSON.stringify({
        therapists: scoredTherapists,
        count: scoredTherapists.length,
        searchCriteria: {
          specialty: searchSpecialty,
          insurance: searchInsurance
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in find-therapist:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

