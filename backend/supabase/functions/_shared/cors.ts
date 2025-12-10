export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    // Return 204 No Content for preflight requests with proper CORS headers
    // Preflight requests should not have a body
    return new Response(null, { 
      status: 204,
      statusText: 'No Content',
      headers: corsHeaders 
    });
  }
  return null;
}

